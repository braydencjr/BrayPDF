import { useEffect } from 'react'

export default function ConversionResult({ fileUrl, fileName, onReset }) {
  useEffect(() => {
    // Optional: auto trigger download
    // const link = document.createElement('a')
    // link.href = fileUrl
    // link.setAttribute('download', fileName)
    // document.body.appendChild(link)
    // link.click()
    // document.body.removeChild(link)
  }, [fileUrl, fileName])

  return (
    <div className="uploader-card glass-panel animate-fade-in" style={{ padding: '4rem 2rem' }}>
      <div style={{ marginBottom: '2rem', color: '#10b981' }}>
        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px', margin: '0 auto' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h2 style={{ marginBottom: '0.5rem' }}>Conversion Successful!</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
        Your file(s) are ready for download.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <a 
          href={fileUrl} 
          download={fileName}
          className="glass-button"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          Download File
        </a>
        
        <button 
          onClick={onReset}
          className="glass-button"
          style={{ background: 'transparent', border: '1px solid var(--border)' }}
        >
          Convert More
        </button>
      </div>
    </div>
  )
}
