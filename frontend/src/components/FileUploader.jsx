import { useState, useRef } from 'react'

export default function FileUploader({ mode, onSessionCreated, onConversionSuccess }) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [actionType, setActionType] = useState('merge') // 'merge' or 'individual'
  const fileInputRef = useRef(null)

  const acceptString = mode === 'pdf-to-word' ? '.pdf' : '.doc,.docx'

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files))
    }
  }

  const addFiles = (newFiles) => {
    setError(null)
    const validFiles = newFiles.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase()
      if (mode === 'pdf-to-word' && ext !== 'pdf') return false
      if (mode === 'word-to-pdf' && !['doc', 'docx'].includes(ext)) return false
      return true
    })

    if (validFiles.length !== newFiles.length) {
      setError(`Some files were skipped. Only ${acceptString} files are allowed.`)
    }

    setFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    
    setIsUploading(true)
    setError(null)
    
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    
    try {
      // Step 1: Upload
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const uploadRes = await fetch(`${API_BASE_URL}/api/upload-session`, {
        method: 'POST',
        body: formData,
      })
      
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || uploadData.error) {
        throw new Error(uploadData.error || 'Upload failed. Please try again.')
      }

      const effectiveActionType = files.length === 1 ? 'individual' : actionType;

      if (effectiveActionType === 'merge') {
        // Proceed to preview grid
        onSessionCreated(uploadData)
      } else {
        // Step 2: Convert individually
        const targetFormat = mode === 'pdf-to-word' ? 'docx' : 'pdf'
        const processRes = await fetch(`${API_BASE_URL}/api/process-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: uploadData.session_id,
            target_format: targetFormat,
            pages: [],
            action: 'individual'
          })
        })

        if (!processRes.ok) {
          const processData = await processRes.json().catch(() => null)
          throw new Error(processData?.error || 'Processing failed.')
        }

        const blob = await processRes.blob()
        const url = window.URL.createObjectURL(blob)
        
        const contentDisposition = processRes.headers.get('content-disposition')
        let filename = files.length === 1 ? 
          (files[0].name.split('.').slice(0, -1).join('.') + (targetFormat === 'pdf' ? '.pdf' : '.docx')) 
          : 'converted_files.zip'
          
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1]
          }
        }
        
        // Use App.jsx's onConversionSuccess to show the result screen
        onConversionSuccess({ url, filename })
      }
      
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const effectiveActionType = files.length === 1 ? 'individual' : actionType;

  return (
    <div className="uploader-card glass-panel animate-fade-in">
      <h2>Upload your {mode === 'pdf-to-word' ? 'PDF' : 'Word'} files</h2>
      
      <div 
        className={`drop-zone ${isDragging ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p>Drag and drop files here, or click to browse</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Accepts {acceptString}
        </p>
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept={acceptString}
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div style={{ color: '#ef4444', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-word' }}>
          {error}
        </div>
      )}

      {files.length > 0 && (
        <>
          {files.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ color: actionType === 'individual' ? 'var(--text-main)' : 'var(--text-muted)' }}>Convert Individually (ZIP)</span>
              
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                <input 
                  type="checkbox" 
                  checked={actionType === 'merge'}
                  onChange={(e) => setActionType(e.target.checked ? 'merge' : 'individual')}
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                  backgroundColor: actionType === 'merge' ? 'var(--primary)' : 'var(--border)', 
                  transition: '.4s', borderRadius: '24px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '16px', width: '16px', 
                    left: actionType === 'merge' ? '24px' : '4px', bottom: '4px', backgroundColor: 'white', 
                    transition: '.4s', borderRadius: '50%'
                  }}></span>
                </span>
              </label>

              <span style={{ color: actionType === 'merge' ? 'var(--text-main)' : 'var(--text-muted)' }}>Preview & Merge Pages</span>
            </div>
          )}

          <div className="file-list">
            {files.map((file, i) => (
              <div key={i} className="file-item animate-fade-in">
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                <button className="remove-btn" onClick={() => removeFile(i)}>×</button>
              </div>
            ))}
          </div>
        </>
      )}

      <button 
        className="glass-button" 
        onClick={handleUpload} 
        disabled={files.length === 0 || isUploading}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {isUploading ? (
            <><span className="spinner"></span> Uploading & Processing...</>
        ) : (effectiveActionType === 'merge' ? 'Continue to Preview' : (files.length === 1 ? 'Convert File' : 'Convert Files'))}
      </button>
    </div>
  )
}
