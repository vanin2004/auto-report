import React, { useState } from 'react'
import Header from './components/Header'
import TemplatesSection from './components/TemplatesSection'
import GenerationSection from './components/GenerationSection'

export default function App() {
  const [activeSection, setActiveSection] = useState('templates')

  return (
    <>
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      <main>
        {activeSection === 'templates' && <TemplatesSection onGenerateClick={() => setActiveSection('generate')} />}
        {activeSection === 'generate' && <GenerationSection />}
      </main>
    </>
  )
}
