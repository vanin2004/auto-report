import React, { useState, useEffect } from 'react'

export default function RemapModal({ missingPaths, uploadedPaths, onApply, onCancel }) {
  const [remapValues, setRemapValues] = useState({})

  useEffect(() => {
    const initial = {}
    missingPaths.forEach((path, i) => {
      initial[i] = { select: '', url: '' }
    })
    setRemapValues(initial)
  }, [missingPaths])

  const handleSelectChange = (i, value) => {
    setRemapValues(prev => ({
      ...prev,
      [i]: { ...prev[i], select: value, url: value ? '' : prev[i].url }
    }))
  }

  const handleUrlChange = (i, value) => {
    setRemapValues(prev => ({
      ...prev,
      [i]: { ...prev[i], url: value, select: value.trim() ? '' : prev[i].select }
    }))
  }

  const handleApply = () => {
    const result = new Map()
    missingPaths.forEach((path, i) => {
      const { select, url } = remapValues[i] || {}
      result.set(path, url.trim() || select || null)
    })
    onApply(result)
  }

  return (
    <div className="remap-overlay" role="dialog" aria-modal="true" aria-labelledby="remap-title">
      <div className="remap-modal">
        <h2 id="remap-title">⚠️ Несоответствие путей изображений</h2>
        <p className="remap-desc">
          Для каждого пути из Markdown укажите, какой загруженный файл ему соответствует,
          либо введите URL. Путь в Markdown будет заменён. Оставьте пустым, чтобы пропустить.
        </p>
        <div className="remap-rows">
          {missingPaths.map((mdPath, i) => (
            <div key={i} className="remap-row" data-i={i}>
              <div className="remap-src" title={mdPath}>{mdPath}</div>
              <div className="remap-arrow">→</div>
              <div className="remap-target">
                <select 
                  className="remap-select" 
                  data-i={i}
                  value={remapValues[i]?.select || ''}
                  onChange={(e) => handleSelectChange(i, e.target.value)}
                >
                  <option value="">— Оставить пустым —</option>
                  {uploadedPaths.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div className="remap-or">— или URL —</div>
                <input 
                  type="text" 
                  className="remap-url-input" 
                  data-i={i}
                  value={remapValues[i]?.url || ''}
                  onChange={(e) => handleUrlChange(i, e.target.value)}
                  placeholder="https://example.com/image.png"
                  autoComplete="off"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="remap-actions">
          <button 
            type="button" 
            className="btn btn-primary" 
            id="remap-apply"
            onClick={handleApply}
          >
            Применить и генерировать
          </button>
          <button 
            type="button" 
            className="btn btn-ghost" 
            id="remap-cancel"
            onClick={onCancel}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
