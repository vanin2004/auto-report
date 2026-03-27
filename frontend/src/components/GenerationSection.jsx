import React, { useState, useEffect, useRef } from 'react'
import RemapModal from './RemapModal'
import AdvancedOptions from './AdvancedOptions'

const API = '/api'

export default function GenerationSection() {
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [outputFormat, setOutputFormat] = useState('docx')
  const [imagesMap, setImagesMap] = useState(new Map())
  const [listingsMap, setListingsMap] = useState(new Map())
  const [imageMismatch, setImageMismatch] = useState({ missing: [], extra: [] })
  const [showRemapModal, setShowRemapModal] = useState(false)
  const [missingPaths, setMissingPaths] = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadName, setDownloadName] = useState('')
  const mdFileInputRef = useRef(null)
  const imagesFilesInputRef = useRef(null)
  const imagesFolderInputRef = useRef(null)
  const listingsFilesInputRef = useRef(null)
  const listingsFolderInputRef = useRef(null)
  const advOptionsRef = useRef(null)

  useEffect(() => {
    loadTemplatesIntoSelect()
  }, [])

  const loadTemplatesIntoSelect = async () => {
    try {
      const response = await fetch(`${API}/templates`)
      if (!response.ok) return
      const data = await response.json()
      setTemplates(data)
    } catch (_) {
      // ignore
    }
  }

  const extractMarkdownImagePaths = (md) => {
    const paths = new Set()
    const re = /!\[[^\]]*\]\(([^)]+?)\)/g
    let m
    while ((m = re.exec(md)) !== null) {
      const p = m[1].trim()
      if (!p.startsWith('http') && !p.startsWith('data:') && !p.startsWith('_diagrams/')) {
        paths.add(p)
      }
    }
    return paths
  }

  const diffImagePaths = (md, images) => {
    const referenced = extractMarkdownImagePaths(md)
    const uploaded = new Set(images.keys())
    const missing = [...referenced].filter((p) => !uploaded.has(p))
    const extra = [...uploaded].filter((p) => !referenced.has(p) && !p.endsWith('.json'))
    return { missing, extra }
  }

  const checkImageMismatch = (mdText, imgs) => {
    const { missing, extra } = diffImagePaths(mdText, imgs)
    setImageMismatch({ missing, extra })
  }

  const handleMarkdownChange = (e) => {
    const newMd = e.target.value
    setMarkdown(newMd)
    checkImageMismatch(newMd, imagesMap)
  }

  const handleMarkdownFileLoad = () => {
    mdFileInputRef.current?.click()
  }

  const handleMdFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target.result
      setMarkdown(content)
      checkImageMismatch(content, imagesMap)
      e.target.value = ''
    }
    reader.readAsText(file, 'utf-8')
  }

  const addImagesToMap = (files) => {
    const newMap = new Map(imagesMap)
    for (const file of files) {
      const relPath = file.webkitRelativePath || file.name
      newMap.set(relPath, file)
    }
    setImagesMap(newMap)
    checkImageMismatch(markdown, newMap)
  }

  const addListingsToMap = (files) => {
    const newMap = new Map(listingsMap)
    for (const file of files) {
      const relPath = file.webkitRelativePath || file.name
      newMap.set(relPath, file)
    }
    setListingsMap(newMap)
  }

  const removeImage = (relPath) => {
    const newMap = new Map(imagesMap)
    newMap.delete(relPath)
    setImagesMap(newMap)
    checkImageMismatch(markdown, newMap)
  }

  const removeListing = (relPath) => {
    const newMap = new Map(listingsMap)
    newMap.delete(relPath)
    setListingsMap(newMap)
  }

  const handleClearImages = () => {
    if (!confirm('Очистить все загруженные изображения?')) return
    setImagesMap(new Map())
    checkImageMismatch(markdown, new Map())
  }

  const handleRemoveExtraImages = () => {
    const { extra } = imageMismatch
    if (extra.length === 0) {
      alert('Лишних изображений не найдено.')
      return
    }
    if (!confirm(`Удалить ${extra.length} лишних изображений?`)) return
    const newMap = new Map(imagesMap)
    for (const p of extra) {
      newMap.delete(p)
    }
    setImagesMap(newMap)
    checkImageMismatch(markdown, newMap)
  }

  const handleClearListings = () => {
    if (!confirm('Очистить все файлы листинга?')) return
    setListingsMap(new Map())
  }

  const handleImagesInputFiles = (e) => {
    if (e.target.files) {
      addImagesToMap(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleImagesInputFolder = (e) => {
    if (e.target.files) {
      addImagesToMap(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleListingsInputFiles = (e) => {
    if (e.target.files) {
      addListingsToMap(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleListingsInputFolder = (e) => {
    if (e.target.files) {
      addListingsToMap(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleRemapApply = (remapResult) => {
    let newMd = markdown
    const newImagesMap = new Map(imagesMap)
    
    for (const [oldPath, newPath] of remapResult.entries()) {
      if (!newPath) continue
      const escaped = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      newMd = newMd.replace(
        new RegExp(`(!\\[[^\\]]*\\]\\()${escaped}(\\))`, 'g'),
        `$1${newPath}$2`
      )
      if (!newPath.startsWith('http') && !newPath.startsWith('data:')) {
        const file = imagesMap.get(oldPath)
        if (file) newImagesMap.set(newPath, file)
      }
    }
    
    setMarkdown(newMd)
    setImagesMap(newImagesMap)
    setShowRemapModal(false)
    submitForm(newMd, newImagesMap)
  }

  const collectPandocOptions = () => {
    const toc = document.getElementById('opt-toc')?.checked || false
    const numberSections = document.getElementById('opt-number-sections')?.checked || false
    return {
      toc,
      toc_depth: parseInt(document.getElementById('opt-toc-depth')?.value || 3, 10),
      number_sections: numberSections,
      number_offset: numberSections
        ? (document.getElementById('opt-number-offset')?.value?.trim() || null)
        : null,
      top_level_division: document.getElementById('opt-top-division')?.value || 'default',
      lof: document.getElementById('opt-lof')?.checked || false,
      lot: document.getElementById('opt-lot')?.checked || false,
      figure_caption_position: document.getElementById('opt-fig-cap')?.value || 'below',
      table_caption_position: document.getElementById('opt-tbl-cap')?.value || 'above',
      syntax_highlighting: document.getElementById('opt-highlight')?.value || 'default',
      crossref: document.getElementById('opt-crossref')?.checked || false,
      auto_scale_images: document.getElementById('opt-auto-scale')?.checked !== false,
      equation_style: document.getElementById('opt-equation-style')?.checked || false,
    }
  }

  const submitForm = async (mdText, imgMap) => {
    setGenerating(true)
    setError('')
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('template_id', String(Number(selectedTemplate)))
      formData.append('markdown_content', mdText)
      formData.append('output_format', outputFormat)
      formData.append('options', JSON.stringify(collectPandocOptions()))
      formData.append(
        'include_diagrams',
        document.getElementById('opt-include-diagrams')?.checked ? 'true' : 'false'
      )

      for (const [relPath, file] of imgMap.entries()) {
        formData.append('images', file, relPath)
      }

      if (document.getElementById('opt-include-listings')?.checked) {
        for (const [relPath, file] of listingsMap.entries()) {
          formData.append('listings', file, relPath)
        }
      }

      const resp = await fetch(`${API}/generate`, {
        method: 'POST',
        body: formData,
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.detail || `Ошибка ${resp.status}`)
      }

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      
      const isZip = resp.headers.get('content-type')?.includes('zip')
      setDownloadName(isZip ? 'document.zip' : `document.${outputFormat}`)
      setSuccess(true)

      // Auto-trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = isZip ? 'document.zip' : `document.${outputFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedTemplate || !markdown.trim()) {
      setError('Выберите шаблон и введите Markdown-содержимое.')
      return
    }

    const { missing } = imageMismatch
    if (missing.length > 0) {
      setMissingPaths(missing)
      setShowRemapModal(true)
      return
    }

    await submitForm(markdown, imagesMap)
  }

  return (
    <section className="page-section active">
      <div className="section-header">
        <h1>Генерация документа</h1>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="gen-template">Шаблон <span className="req">*</span></label>
            <select 
              id="gen-template" 
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              required
            >
              <option value="">— Выберите шаблон —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="gen-markdown">Markdown-содержимое <span className="req">*</span></label>
            <div className="md-toolbar">
              <button 
                type="button" 
                className="icon-btn" 
                id="btn-load-md" 
                title="Загрузить .md файл"
                onClick={handleMarkdownFileLoad}
              >
                📂 Загрузить .md файл
              </button>
              <input 
                type="file" 
                ref={mdFileInputRef}
                id="md-file-input" 
                accept=".md,.markdown,.txt" 
                className="hidden"
                onChange={handleMdFileChange}
              />
            </div>
            <textarea 
              id="gen-markdown" 
              rows="20"
              value={markdown}
              onChange={handleMarkdownChange}
              placeholder="# Заголовок&#10;&#10;Введите или вставьте Markdown-содержимое здесь…&#10;&#10;## Формулы&#10;Инлайн: $E=mc^2$&#10;Блочная:&#10;$$\int_0^\infty e^{-x} dx = 1$$"
              required
            />
          </div>

          <div className="form-group">
            <label>Изображения</label>
            <div className="img-zone" id="img-drop-area">
              <p className="img-drop-hint">Перетащите изображения (или папку) сюда</p>
              <div className="img-btns">
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  id="btn-add-img-files"
                  onClick={() => imagesFilesInputRef.current?.click()}
                >
                  🖼 Выбрать файлы
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  id="btn-add-img-folder"
                  onClick={() => imagesFolderInputRef.current?.click()}
                >
                  🗂 Выбрать папку
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  id="btn-remove-extra-images"
                  onClick={handleRemoveExtraImages}
                >
                  🧹 Удалить лишние
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  id="btn-clear-images"
                  onClick={handleClearImages}
                >
                  🗑 Очистить
                </button>
              </div>
              <input 
                type="file" 
                ref={imagesFilesInputRef}
                id="images-input-files" 
                accept="image/*" 
                multiple 
                className="hidden"
                onChange={handleImagesInputFiles}
              />
              <input 
                type="file" 
                ref={imagesFolderInputRef}
                id="images-input-folder" 
                accept="image/*" 
                webkitdirectory=""
                className="hidden"
                onChange={handleImagesInputFolder}
              />
            </div>
            {imagesMap.size > 0 && (
              <ul className="img-file-list">
                {Array.from(imagesMap.keys()).map(p => (
                  <li key={p} className="img-file-item">
                    <span className="img-file-icon">🖼</span>
                    <span className="img-file-name" title={p}>{p}</span>
                    <button 
                      type="button" 
                      className="icon-btn-sm" 
                      onClick={() => removeImage(p)}
                      aria-label="Удалить"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <span className="hint">PNG, JPG, SVG, GIF, WebP. Относительные пути из markdown сохраняются — загрузите папку целиком, если изображения в подпапках.</span>
            {(imageMismatch.missing.length > 0 || imageMismatch.extra.length > 0) && (
              <div id="image-mismatch-warn" className="alert alert-warning">
                {imageMismatch.missing.length > 0 && (
                  <>
                    <strong>⚠ Не загружены файлы, на которые есть ссылки в Markdown ({imageMismatch.missing.length}):</strong>
                    <ul>
                      {imageMismatch.missing.map(p => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </>
                )}
                {imageMismatch.extra.length > 0 && (
                  <>
                    <strong>ℹ Загружены файлы, не упомянутые в Markdown ({imageMismatch.extra.length}):</strong>
                    <ul>
                      {imageMismatch.extra.map(p => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Листинги (код)</label>
            <div className="img-zone" id="listing-drop-area">
              <p className="img-drop-hint">Загрузите файлы листингов (или папку) сюда</p>
              <div className="img-btns">
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  id="btn-add-list-files"
                  onClick={() => listingsFilesInputRef.current?.click()}
                >
                  📄 Выбрать файлы
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  id="btn-add-list-folder"
                  onClick={() => listingsFolderInputRef.current?.click()}
                >
                  🗂 Выбрать папку
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  id="btn-clear-listings"
                  onClick={handleClearListings}
                >
                  🗑 Очистить листинг
                </button>
              </div>
              <input 
                type="file" 
                ref={listingsFilesInputRef}
                id="listings-input-files" 
                accept="*/*" 
                multiple 
                className="hidden"
                onChange={handleListingsInputFiles}
              />
              <input 
                type="file" 
                ref={listingsFolderInputRef}
                id="listings-input-folder" 
                accept="*/*" 
                webkitdirectory=""
                className="hidden"
                onChange={handleListingsInputFolder}
              />
            </div>
            {listingsMap.size > 0 && (
              <ul className="img-file-list">
                {Array.from(listingsMap.keys()).map(p => (
                  <li key={p} className="img-file-item">
                    <span className="img-file-icon">📄</span>
                    <span className="img-file-name" title={p}>{p}</span>
                    <button 
                      type="button" 
                      className="icon-btn-sm" 
                      onClick={() => removeListing(p)}
                      aria-label="Удалить"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="check-label">
              <input type="checkbox" id="opt-include-listings" />
              <span>Включать листинги в документ (Приложение (Листинг))</span>
            </label>
            <span className="hint">Загрузите файлы с исходным кодом; они будут добавлены в конец документа.</span>
          </div>

          <div className="form-group">
            <label>Формат вывода</label>
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="output-format" 
                  value="docx"
                  checked={outputFormat === 'docx'}
                  onChange={(e) => setOutputFormat(e.target.value)}
                />
                <span className="radio-box">DOCX</span>
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="output-format" 
                  value="pdf"
                  checked={outputFormat === 'pdf'}
                  onChange={(e) => setOutputFormat(e.target.value)}
                />
                <span className="radio-box">PDF</span>
              </label>
            </div>
          </div>

          <AdvancedOptions ref={advOptionsRef} />

          {error && <div className="alert alert-error">{error}</div>}
          {success && (
            <div className="alert alert-success">
              <span>✅ Документ сгенерирован!</span>
              {downloadUrl && (
                <a 
                  href={downloadUrl} 
                  download={downloadName}
                  className="btn btn-success btn-sm"
                >
                  ⬇ Скачать
                </a>
              )}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary" 
              id="btn-generate"
              disabled={generating}
            >
              <span className="btn-label">
                {generating ? 'Генерация…' : 'Генерировать'}
              </span>
              {generating && <span className="spinner" aria-hidden="true"></span>}
            </button>
          </div>
        </form>
      </div>

      {showRemapModal && (
        <RemapModal 
          missingPaths={missingPaths}
          uploadedPaths={Array.from(imagesMap.keys())}
          onApply={handleRemapApply}
          onCancel={() => setShowRemapModal(false)}
        />
      )}
    </section>
  )
}
