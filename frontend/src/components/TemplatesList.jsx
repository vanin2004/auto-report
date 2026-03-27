import React from 'react'

const API = '/api'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TemplatesList({ templates, onDelete, onGenerateClick }) {
  const handleDownload = (id) => {
    window.open(`${API}/templates/${id}/download`, '_blank')
  }

  if (templates.length === 0) return null

  return (
    <div id="templates-container">
      {templates.map(template => (
        <div key={template.id} className="template-card">
          <div className="template-info">
            <h3 title={template.name}>{template.name}</h3>
            <p className="template-desc">{template.description || '—'}</p>
            <p className="template-date">Загружен: {formatDate(template.created_at)}</p>
          </div>
          <div className="template-actions">
            <button 
              className="btn btn-primary btn-sm btn-generate-template"
              onClick={onGenerateClick}
            >
              Generate
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm btn-download-template"
              onClick={() => handleDownload(template.id)}
            >
              Download
            </button>
            <button 
              className="btn btn-danger btn-sm btn-delete-template"
              onClick={() => onDelete(template.id, template.name)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
