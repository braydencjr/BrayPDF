import { useState } from 'react'
import FileUploader from './components/FileUploader'
import PreviewGrid from './components/PreviewGrid'
import ConversionResult from './components/ConversionResult'
import logo from './assets/logo.png'

function App() {
  const [mode, setMode] = useState('pdf-to-word') // 'pdf-to-word' or 'word-to-pdf'
  const [sessionData, setSessionData] = useState(null)
  const [conversionResult, setConversionResult] = useState(null)
  
  const handleReset = () => {
    setSessionData(null)
    setConversionResult(null)
  }

  return (
    <div className="app-container">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <img src={logo} alt="Logo" style={{ height: '48px', objectFit: 'contain' }} />
          <h1 style={{ margin: 0 }}>Bray's PDF</h1>
        </div>
        <p className="subtitle">Premium Document Conversion</p>
      </header>
      
      <main className="main-content animate-fade-in">
        {!sessionData && !conversionResult && (
          <div className="mode-toggle glass-panel">
            <button 
              className={`mode-btn ${mode === 'pdf-to-word' ? 'active' : ''}`}
              onClick={() => setMode('pdf-to-word')}
            >
              PDF to Word
            </button>
            <button 
              className={`mode-btn ${mode === 'word-to-pdf' ? 'active' : ''}`}
              onClick={() => setMode('word-to-pdf')}
            >
              Word to PDF
            </button>
          </div>
        )}

        {!sessionData && !conversionResult && (
          <FileUploader 
            mode={mode} 
            onSessionCreated={setSessionData} 
            onConversionSuccess={setConversionResult}
          />
        )}

        {sessionData && !conversionResult && (
          <PreviewGrid 
            mode={mode}
            sessionData={sessionData}
            onConversionSuccess={setConversionResult}
            onCancel={() => setSessionData(null)}
          />
        )}

        {conversionResult && (
          <ConversionResult 
            fileUrl={conversionResult.url} 
            fileName={conversionResult.filename}
            onReset={handleReset} 
          />
        )}
      </main>
    </div>
  )
}

export default App
