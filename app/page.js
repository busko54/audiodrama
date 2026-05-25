'use client'
import { useState, useRef, useEffect } from 'react'

export default function Home() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentBlock, setCurrentBlock] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const voiceRef = useRef(null)
  const ambienceRef = useRef(null)
  const ambience2Ref = useRef(null)
  
  const runFullTest = async () => {
    setLoading(true)
    setBlocks([])
    setCurrentBlock(-1)
    setIsPlaying(false)

    const parseRes = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterText: '',
        bookId: 'pride-and-prejudice',
        chapterNumber: 1
      })
    })
    const parseData = await parseRes.json()

    const stitchRes = await fetch('/api/stitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: parseData.blocks,
        bookId: 'pride-and-prejudice',
        chapterNumber: 1
      })
    })
    const stitchData = await stitchRes.json()

    setFromCache(stitchData.fromCache || false)
    setBlocks(stitchData.blocks)
    setLoading(false)
  }

  const playFrom = (index) => {
    if (index >= blocks.length) {
      setIsPlaying(false)
      setCurrentBlock(-1)
      if (ambienceRef.current) {
        ambienceRef.current.pause()
        ambienceRef.current.src = ''
      }
      return
    }
    setCurrentBlock(index)
    setIsPlaying(true)
  }

  useEffect(() => {
    if (currentBlock >= 0 && blocks[currentBlock]) {
      const block = blocks[currentBlock]

      if (block.audio && voiceRef.current) {
        voiceRef.current.src = `data:audio/mpeg;base64,${block.audio}`
        voiceRef.current.volume = 1.0
        voiceRef.current.play()
      }

      if (ambienceRef.current) {
        if (block.ambienceAudio) {
          console.log('Ambience audio length:', block.ambienceAudio?.length)
          console.log('Ambience volume:', block.ambience_volume)
          ambienceRef.current.src = `data:audio/mpeg;base64,${block.ambienceAudio}`
          ambienceRef.current.volume = Math.min(block.ambience_volume || 0.25, 1.0)
          ambienceRef.current.loop = true
          ambienceRef.current.play()
            .then(() => console.log('Ambience playing successfully'))
            .catch(err => console.error('Ambience play error:', err))
        } else {
          console.log('No ambience audio for this block')
          ambienceRef.current.pause()
          ambienceRef.current.src = ''
        }
      }
    }
  }, [currentBlock, blocks])

  const handleVoiceEnd = () => {
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
      <p style={{ color: '#888', marginBottom: '0.5rem' }}>
        Pride and Prejudice — Chapter I
      </p>

      {fromCache && (
        <p style={{ color: '#4CAF50', fontSize: '12px', marginBottom: '1.5rem' }}>
          ⚡ Served from cache — no credits used
        </p>
      )}

      <audio ref={voiceRef} onEnded={handleVoiceEnd} style={{ display: 'none' }} />
      <audio ref={ambienceRef} loop style={{ display: 'none' }} />

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
          {loading ? 'Generating...' : 'Play Pride and Prejudice'}
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

      {loading && (
        <div style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: '10px',
          padding: '2rem',
          textAlign: 'center',
          color: '#888'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎭</div>
          <p>Generating voices and ambient sounds...</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>This takes about 30 seconds</p>
        </div>
      )}

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
            {currentBlock === i && <span style={{ fontSize: '16px' }}>🔊</span>}
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
