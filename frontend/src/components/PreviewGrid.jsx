import { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortablePage({ page, sessionId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
  }

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const thumbnailUrl = `${API_BASE_URL}/api/thumbnail/${sessionId}/${page.pdf_filename}/${page.page_number}`

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="page-thumbnail-card"
    >
      <div className="page-thumbnail-img">
        <img src={thumbnailUrl} alt={page.label} draggable={false} />
      </div>
      <div className="page-label">{page.label}</div>
    </div>
  )
}

export default function PreviewGrid({ mode, sessionData, onConversionSuccess, onCancel }) {
  const [pages, setPages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sessionData) return
    const initialPages = []
    sessionData.files.forEach(file => {
      for(let i=0; i<file.num_pages; i++) {
        initialPages.push({
          id: `${file.pdf_filename}-${i}`,
          pdf_filename: file.pdf_filename,
          page_number: i,
          label: `${file.original_filename} (Pg ${i+1})`
        })
      }
    })
    setPages(initialPages)
  }, [sessionData])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleProcess = async () => {
    setIsProcessing(true)
    setError(null)
    
    const targetFormat = mode === 'pdf-to-word' ? 'docx' : 'pdf'
    
    const payload = {
      session_id: sessionData.session_id,
      target_format: targetFormat,
      pages: pages.map(p => ({
        pdf_filename: p.pdf_filename,
        page_number: p.page_number
      }))
    }
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_BASE_URL}/api/process-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Processing failed.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `merged_document.${targetFormat}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1]
        }
      }
      
      onConversionSuccess({ url, filename })
      
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="preview-container animate-fade-in glass-panel">
      <div className="preview-header">
        <h2>Preview & Reorder Pages</h2>
        <p className="subtitle" style={{marginBottom: '1.5rem'}}>Drag and drop the pages to adjust their order.</p>
      </div>

      {error && (
        <div style={{ color: '#ef4444', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div className="grid-wrapper">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={pages.map(p => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="page-grid">
              {pages.map(page => (
                <SortablePage 
                  key={page.id} 
                  page={page} 
                  sessionId={sessionData.session_id} 
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="preview-actions">
        <button 
          className="glass-button" 
          onClick={onCancel}
          disabled={isProcessing}
          style={{ background: 'transparent', border: '1px solid var(--border)' }}
        >
          Cancel
        </button>
        <button 
          className="glass-button" 
          onClick={handleProcess} 
          disabled={isProcessing}
        >
          {isProcessing ? (
            <><span className="spinner"></span> Processing...</>
          ) : 'Merge & Convert'}
        </button>
      </div>
    </div>
  )
}
