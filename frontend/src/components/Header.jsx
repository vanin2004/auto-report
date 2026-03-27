import React from 'react'

export default function Header({ activeSection, setActiveSection }) {
  return (
    <header>
      <nav>
        <span className="logo">📄 DocGen</span>
        <div className="nav-links">
          <button 
            className={`nav-btn ${activeSection === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveSection('templates')}
          >
            Шаблоны
          </button>
          <button 
            className={`nav-btn ${activeSection === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveSection('generate')}
          >
            Генерация
          </button>
        </div>
      </nav>
    </header>
  )
}
