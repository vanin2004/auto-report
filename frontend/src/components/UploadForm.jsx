import React, { useState } from 'react'

const API = '/api'

export default function UploadForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    file: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNameChange = (e) => {
    setFormData(prev => ({ ...prev, name: e.target.value }))
  }

  const handleDescriptionChange = (e) => {
    setFormData(prev => ({ ...prev, description: e.target.value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, file }))
      // Pre-fill name from filename if name is empty
      if (!prev.name.trim()) {
        setFormData(prev => ({ 
          ...prev, 
          name: file.name.replace(/\.docx$/i, '')
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.file) return

    setLoading(true)
    const body = new FormData()
    body.append('name', formData.name)
    body.append('description', formData.description)
    body.append('file', formData.file)

    try {
      const resp = await fetch(`${API}/templates`, { method: 'POST', body })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.detail || `Ошибка ${resp.status}`)
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Загрузить новый шаблон</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="template-name">Имя шаблона <span className="req">*</span></label>
          <input 
            type="text" 
            id="template-name"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="Название шаблона" 
            autoComplete="off"
            required 
          />
        </div>
        <div className="form-group">
          <label htmlFor="template-description">Описание</label>
          <textarea 
            id="template-description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Краткое описание шаблона" 
            rows="2"
          />
        </div>
        <div className="form-group">
          <label htmlFor="template-file">DOCX файл <span className="req">*</span></label>
          <input 
            type="file" 
            id="template-file"
            onChange={handleFileChange}
            accept=".docx" 
            required 
          />
          <span className="hint">Максимальный размер: 20 МБ</span>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Загрузка…' : 'Загрузить'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}
