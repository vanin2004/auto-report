import React, { forwardRef } from 'react'

const AdvancedOptions = forwardRef((props, ref) => {
  const handleTocChange = (e) => {
    const tocDepthInput = document.getElementById('opt-toc-depth')
    if (tocDepthInput) {
      tocDepthInput.disabled = !e.target.checked
    }
  }

  const handleNumberSectionsChange = (e) => {
    const offsetInput = document.getElementById('opt-number-offset')
    if (offsetInput) {
      offsetInput.disabled = !e.target.checked
    }
  }

  return (
    <details className="adv-options" id="adv-options" ref={ref}>
      <summary>⚙ Дополнительные параметры</summary>
      <div className="adv-grid">
        
        {/* TOC */}
        <div className="opt-check-group">
          <label className="check-label">
            <input 
              type="checkbox" 
              id="opt-toc"
              onChange={handleTocChange}
            />
            <span>Оглавление <code>--toc</code></span>
          </label>
          <div className="opt-sub">
            <label htmlFor="opt-toc-depth" className="opt-sub-label">Глубина</label>
            <input 
              type="number" 
              id="opt-toc-depth" 
              defaultValue="3" 
              min="1" 
              max="6" 
              className="opt-num"
              disabled
            />
          </div>
        </div>

        {/* Number sections */}
        <div className="opt-check-group">
          <label className="check-label">
            <input 
              type="checkbox" 
              id="opt-number-sections"
              onChange={handleNumberSectionsChange}
            />
            <span>Нумерация разделов <code>--number-sections</code></span>
          </label>
          <div className="opt-sub">
            <label htmlFor="opt-number-offset" className="opt-sub-label">Смещение</label>
            <input 
              type="text" 
              id="opt-number-offset" 
              placeholder="напр. 1,4" 
              className="opt-text"
              disabled
            />
          </div>
        </div>

        {/* Top-level division */}
        <div className="opt-row">
          <label htmlFor="opt-top-division" className="opt-row-label">
            Разбивка разделов <code>--top-level-division</code>
          </label>
          <select id="opt-top-division" className="opt-select">
            <option value="default">default</option>
            <option value="section">section</option>
            <option value="chapter">chapter (разрывы страниц)</option>
            <option value="part">part</option>
          </select>
        </div>

        {/* Syntax highlighting */}
        <div className="opt-row">
          <label htmlFor="opt-highlight" className="opt-row-label">
            Подсветка кода <code>--syntax-highlighting</code>
          </label>
          <select id="opt-highlight" className="opt-select">
            <option value="default">default (pygments)</option>
            <option value="none">нет</option>
            <option value="pygments">pygments</option>
            <option value="kate">kate</option>
            <option value="monochrome">monochrome</option>
            <option value="espresso">espresso</option>
            <option value="zenburn">zenburn</option>
            <option value="haddock">haddock</option>
            <option value="tango">tango</option>
          </select>
        </div>

        {/* lof / lot */}
        <div className="opt-row">
          <label className="opt-row-label">Списки</label>
          <div className="check-inline-group">
            <label className="check-label">
              <input type="checkbox" id="opt-lof" />
              <span>Рисунков <code>--lof</code></span>
            </label>
            <label className="check-label">
              <input type="checkbox" id="opt-lot" />
              <span>Таблиц <code>--lot</code></span>
            </label>
          </div>
        </div>

        {/* Caption positions */}
        <div className="opt-row">
          <label className="opt-row-label">Позиция подписей</label>
          <div className="opt-caption-row">
            <span className="opt-caption-lbl">Рисунки</span>
            <select id="opt-fig-cap" className="opt-select opt-select-sm">
              <option value="below">ниже</option>
              <option value="above">выше</option>
            </select>
            <span className="opt-caption-lbl">Таблицы</span>
            <select id="opt-tbl-cap" className="opt-select opt-select-sm">
              <option value="above" defaultValue>выше</option>
              <option value="below">ниже</option>
            </select>
          </div>
        </div>

        {/* ── Filters & rendering ── */}
        <div className="opt-full-row">
          <div className="opt-section-title">Фильтры и рендеринг</div>
        </div>

        {/* Crossref */}
        <div className="opt-check-group">
          <label className="check-label">
            <input type="checkbox" id="opt-crossref" />
            <span>Перекрёстные ссылки <code>pandoc-crossref</code></span>
          </label>
          <p className="opt-hint-note">
            В тексте: <code>[@fig:id]</code> <code>[@tbl:id]</code> <code>[@eq:id]</code>
          </p>
        </div>

        {/* Auto-scale images */}
        <div className="opt-check-group">
          <label className="check-label">
            <input type="checkbox" id="opt-auto-scale" defaultChecked />
            <span>Авто-масштаб изображений до ширины</span>
          </label>
          <p className="opt-hint-note">Изображениям без явного размера задаётся ширина 100%</p>
        </div>

        {/* Equation style (DOCX) */}
        <div className="opt-check-group">
          <label className="check-label">
            <input type="checkbox" id="opt-equation-style" />
            <span>Стиль «Equation» для формул <span className="badge-docx">DOCX</span></span>
          </label>
          <p className="opt-hint-note">Требует стиль абзаца «Equation» в шаблоне</p>
        </div>

        {/* Include diagrams archive */}
        <div className="opt-check-group">
          <label className="check-label">
            <input type="checkbox" id="opt-include-diagrams" />
            <span>Скачать архив с диаграммами <span className="badge-zip">ZIP</span></span>
          </label>
          <p className="opt-hint-note">
            Документ + папка <code>diagrams/</code> с PNG-изображениями
            Mermaid&nbsp;/&nbsp;PlantUML в одном ZIP-файле
          </p>
        </div>

      </div>
    </details>
  )
})

AdvancedOptions.displayName = 'AdvancedOptions'

export default AdvancedOptions
