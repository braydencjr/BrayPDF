# Bray's PDF

> dont want to pay for ilovepdf Pro, so I built my own :)

Bray's PDF is a premium document conversion tool that allows you to seamlessly convert between PDF and Word formats, with advanced features like individual page reordering, merging, and more!

## Features

- **Word to PDF**: Headless conversion retaining absolute formatting.
- **PDF to Word**: Extract and convert PDFs back into editable Word documents.
- **Page-Level Preview**: Visually preview every single page of your documents in a beautiful grid.
- **Drag-and-Drop Sorting**: Rearrange individual pages across multiple documents before merging them into your final file.
- **Individual Conversion**: Convert multiple files in a batch and download them as a ZIP archive instantly.

## Tech Stack

- **Frontend**: React, Vite, dnd-kit (for 2D drag-and-drop grid sorting)
- **Backend**: FastAPI, PyMuPDF (for page extraction/thumbnail rendering), LibreOffice Headless (for Word conversions), pdf2docx

## Local Development

### Prerequisites
- Node.js & npm
- Python 3.10+
- LibreOffice (for `.docx` to `.pdf` conversions)

### Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### Setup Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```
