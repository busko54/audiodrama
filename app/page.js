'use client'
import { useState } from 'react'

export default function Home() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const testParser = async () => {
    setLoading(true)
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterText: `"Must you go? Oh! young Herr, must you go?" She went down on her knees and implored me not to go. "It is the eve of St. George's Day. Do you not know that to-night, when the clock strikes midnight, all the evil things in the world will have full sway?" Then far off in the distance began a louder and sharper howling — that of wolves — which affected both the horses and myself in the same way, for I was minded to jump from the calèche and run.`
      })
    })
    const data = await response.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '2rem',
      fontFamily: 'Georgia, serif'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
        🎭 AudioDrama Parser Test
      </h1>
      <button
        onClick={testParser}
        style={{
          background: '#8B0000',
          color: '#fff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '2rem'
        }}
      >
        {loading ? 'Parsing...' : 'Test Parser with Dracula Scene'}
      </button>

      {result && (
        <pre style={{
          background: '#111',
          padding: '1.5rem',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '13px',
          lineHeight: '1.6',
          border: '1px solid #333'
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  )
}
