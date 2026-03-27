import React, { useState, useEffect } from 'react'
import UploadForm from './UploadForm'
import TemplatesList from './TemplatesList'

const API = '/api'

export default function TemplatesSection({ onGenerateClick }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API}/templates`)
      if (!response.ok) throw new Error('Ошибка загрузки списка шаблонов')
      const data = await response.json()
      setTemplates(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSuccess = () => {
    setShowUploadForm(false)
    loadTemplates()
  }

  const handleDeleteTemplate = async (id, name) => {
    if (!confirm(`Удалить шаблон «${name}»?`)) return
    try {
      const response = await fetch(`${API}/templates/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Ошибка удаления')
      await loadTemplates()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h1>Шаблоны</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          + Загрузить шаблон
        </button>
      </div>

      {showUploadForm && (
        <UploadForm 
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadForm(false)}
        />
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <div className="state-msg">Загрузка…</div>}

      {!loading && templates.length === 0 && !showUploadForm && (
        <div className="state-msg">Нет загруженных шаблонов. Нажмите «Загрузить шаблон».</div>
      )}

      <TemplatesList 
        templates={templates}
        onDelete={handleDeleteTemplate}
        onGenerateClick={onGenerateClick}
      />
    </section>
  )
}
