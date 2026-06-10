import os
import shutil
import uuid
import tempfile
import subprocess
import fitz
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pdf2docx import Converter

app = FastAPI(title="Bray's PDF API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

sessions = {}

@app.post("/api/upload-session")
async def upload_session(files: list[UploadFile] = File(...)):
    session_id = str(uuid.uuid4())
    temp_dir = tempfile.mkdtemp(prefix=f"session_{session_id}_")
    
    session_files = []
    
    try:
        for file in files:
            input_path = os.path.join(temp_dir, file.filename)
            with open(input_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            ext = os.path.splitext(file.filename)[1].lower()
            pdf_path = input_path
            
            if ext in ['.doc', '.docx']:
                libreoffice_path = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
                if not os.path.exists(libreoffice_path):
                    libreoffice_path = 'soffice' # Fallback for Linux/Docker
                    
                process = subprocess.run([
                    libreoffice_path, '--headless', '--convert-to', 'pdf', '--outdir', temp_dir, input_path
                ], capture_output=True, text=True)
                
                if process.returncode != 0:
                    raise Exception(f"Failed to convert {file.filename} to PDF: {process.stderr}")
                
                pdf_path = os.path.splitext(input_path)[0] + ".pdf"
                if not os.path.exists(pdf_path):
                    raise Exception(f"PDF not created for {file.filename}")

            with fitz.open(pdf_path) as pdf:
                num_pages = len(pdf)
                
            session_files.append({
                "original_filename": file.filename,
                "pdf_filename": os.path.basename(pdf_path),
                "num_pages": num_pages
            })
            
        sessions[session_id] = {
            "dir": temp_dir,
            "files": session_files
        }
        
        return {
            "session_id": session_id,
            "files": session_files
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/thumbnail/{session_id}/{pdf_filename}/{page_number}")
async def get_thumbnail(session_id: str, pdf_filename: str, page_number: int):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[session_id]
    pdf_path = os.path.join(session["dir"], pdf_filename)
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        with fitz.open(pdf_path) as pdf:
            if page_number < 0 or page_number >= len(pdf):
                raise HTTPException(status_code=400, detail="Invalid page number")
                
            page = pdf[page_number]
            # Zoom slightly for decent thumbnail quality
            mat = fitz.Matrix(0.5, 0.5) 
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            
            return Response(content=img_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PageReference(BaseModel):
    pdf_filename: str
    page_number: int

class ProcessSessionRequest(BaseModel):
    session_id: str
    target_format: str
    pages: list[PageReference] = []
    action: str = "merge"

@app.post("/api/process-session")
async def process_session(request: ProcessSessionRequest):
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[request.session_id]
    temp_dir = session["dir"]
    
    try:
        if request.action == "individual":
            converted_files = []
            for f in session["files"]:
                pdf_path = os.path.join(temp_dir, f["pdf_filename"])
                if request.target_format == 'pdf':
                    converted_files.append(pdf_path)
                elif request.target_format == 'docx':
                    docx_filename = os.path.splitext(f["original_filename"])[0] + ".docx"
                    docx_path = os.path.join(temp_dir, docx_filename)
                    cv = Converter(pdf_path)
                    cv.convert(docx_path, start=0, end=None)
                    cv.close()
                    converted_files.append(docx_path)
            
            if len(converted_files) == 1:
                media_type = 'application/pdf' if request.target_format == 'pdf' else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                return FileResponse(converted_files[0], media_type=media_type, filename=os.path.basename(converted_files[0]))
            else:
                zip_path = create_zip_archive(converted_files, f"converted_files.zip")
                return FileResponse(zip_path, media_type='application/zip', filename="converted_files.zip")

        # Merge flow
        if not request.pages:
            raise HTTPException(status_code=400, detail="No pages provided for merge")
            
        merged_pdf_path = os.path.join(temp_dir, "merged_output.pdf")
        result_pdf = fitz.open()
        
        open_pdfs = {}
        for pref in request.pages:
            pdf_name = pref.pdf_filename
            if pdf_name not in open_pdfs:
                open_pdfs[pdf_name] = fitz.open(os.path.join(temp_dir, pdf_name))
            
            src_pdf = open_pdfs[pdf_name]
            result_pdf.insert_pdf(src_pdf, from_page=pref.page_number, to_page=pref.page_number)
            
        result_pdf.save(merged_pdf_path)
        result_pdf.close()
        for p in open_pdfs.values():
            p.close()
            
        if request.target_format == 'pdf':
            return FileResponse(merged_pdf_path, media_type='application/pdf', filename="merged_document.pdf")
            
        elif request.target_format == 'docx':
            merged_docx_path = os.path.join(temp_dir, "merged_output.docx")
            cv = Converter(merged_pdf_path)
            cv.convert(merged_docx_path, start=0, end=None)
            cv.close()
            
            return FileResponse(merged_docx_path, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename="merged_document.docx")
            
        else:
            raise HTTPException(status_code=400, detail="Invalid target format")
            
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
def read_root():
    return {"message": "Welcome to Bray's PDF API"}
