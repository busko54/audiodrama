'use client'
import { useState, useRef, useEffect } from 'react'

export default function Home() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentBlock, setCurrentBlock] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  const runFullTest = async () => {
    setLoading(true)
    setBlocks([])
    setCurrentBlock(-1)
    setIsPlaying(false)

    const parseRes = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterText: `"Must you go? Oh! young Herr, must you go?" She went down on her knees and implored me not to go. "It is the eve of St. George's Day. Do you not know that to-night, when the clock strikes midnight, all the evil things in the world will have full sway?" Then far off in the distance began a louder and sharper howling — that of wolves — which affected both the horses and myself in the same way, for I was minded to jump from the calèche and run.`
      })
    })
    const parseData = await parseRes.json()

    const stitchRes = await fetch('/api/stitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: parseData.blocks })
    })
    const stitchData = await stitchRes.json()

    setBlocks(stitchData.blocks)
    setLoading(false)
  }

  const playFrom = (index) => {
    if (index >= blocks.length) {
      setIsPlaying(false)
      setCurrentBlock(-1)
      return
    }
    setCurrentBlock(index)
    setIsPlaying(true)
  }

  useEffect(() => {
    if (currentBlock >= 0 && blocks[currentBlock]?.audio && audioRef.current) {
      audioRef.current.src = `data:audio/mpeg;base64,${blocks[currentBlock].audio}`
      audioRef.current.play()
    }
  }, [currentBlock, blocks])

  const handleAudioEnd = () => {
    playFrom(currentBlock + 1)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '2rem',
      fontFamily: 'Georgia, serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        🎭 AudioDrama
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Dracula — Chapter I
      </p>

      <audio ref={audioRef} onEnded={handleAudioEnd} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={runFullTest}
          disabled={loading}
          style={{
            background: '#8B0000',
            color: '#fff',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Generating...' : 'Generate Dracula Scene'}
        </button>

        {blocks.length > 0 && !loading && (
          <button
            onClick={() => isPlaying ? setIsPlaying(false) : playFrom(0)}
            style={{
              background: '#1a5c2e',
              color: '#fff',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play All'}
          </button>
        )}
      </div>

      {blocks && blocks.length > 0 && blocks.map((block, i) => (
        <div
          key={i}
          onClick={() => playFrom(i)}
          style={{
            background: currentBlock === i ? '#1a0a0a' : '#111',
            border: currentBlock === i ? '1px solid #8B0000' : '1px solid #333',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '8px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {currentBlock === i && (
              <span style={{ fontSize: '16px' }}>🔊</span>
            )}
            <span style={{
              background: '#8B0000',
              color: '#fff',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              {block.speaker}
            </span>
            <span style={{
              background: '#1a1a1a',
              color: '#888',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              {block.tone}
            </span>
            <span style={{
              background: '#1a1a1a',
              color: '#888',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              {block.emotion}
            </span>
            {block.ambience && block.ambience !== 'none' && (
              <span style={{
                background: '#0d2d1a',
                color: '#4CAF50',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}>
                🎵 {block.ambience}
              </span>
            )}
          </div>
          <p style={{
            color: currentBlock === i ? '#fff' : '#ccc',
            fontSize: '14px',
            lineHeight: '1.6',
            fontStyle: 'italic'
          }}>
            "{block.line}"
          </p>
        </div>
      ))}
    </main>
  )
}
