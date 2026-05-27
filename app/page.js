'use client'
import { useState, useRef, useEffect } from 'react'

const NARRATOR_SPEAKERS = ['pp_narrator', 'narrator']

export default function Home() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [generatingIndex, setGeneratingIndex] = useState(-1)
  const [currentBlock, setCurrentBlock] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const voiceRef = useRef(null)
  const ambienceRef = useRef(null)
  const ambience2Ref = useRef(null)
  const momentRef = useRef(null)
  const moment2Ref = useRef(null)
  const musicRef = useRef(null)

  const runFullTest = async () => {
    setLoading(true)
    setBlocks([])
    setCurrentBlock(-1)
    setIsPlaying(false)
    setGeneratingIndex(-1)

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
    const allBlocks = parseData.blocks
    const setting = parseData.setting

    const results = []

    for (let i = 0; i < allBlocks.length; i++) {
      setGeneratingIndex(i)

      const stitchRes = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: [allBlocks[i]],
          setting,
          bookId: 'pride-and-prejudice',
          chapterNumber: 1,
          blockIndex: i,
          previousSpeaker: i > 0 ? allBlocks[i - 1].speaker : null
        })
      })

      const stitchData = await stitchRes.json()
      const result = stitchData.blocks[0]
      results.push(result)
      setBlocks([...results])
    }

    setLoading(false)
    setGeneratingIndex(-1)
  }

  const playFrom = (index) => {
    if (index >= blocks.length) {
      setIsPlaying(false)
      setCurrentBlock(-1)
      if (ambienceRef.current) { ambienceRef.current.pause(); ambienceRef.current.src = '' }
      if (ambience2Ref.current) { ambience2Ref.current.pause(); ambience2Ref.current.src = '' }
      if (momentRef.current) { momentRef.current.pause(); momentRef.current.src = '' }
      if (moment2Ref.current) { moment2Ref.current.pause(); moment2Ref.current.src = '' }
      if (musicRef.current) { musicRef.current.pause(); musicRef.current.src = '' }
      return
    }
    setCurrentBlock(index)
    setIsPlaying(true)
  }

  useEffect(() => {
    if (currentBlock >= 0 && blocks[currentBlock]) {
      const block = blocks[currentBlock]
      const isNarrator = NARRATOR_SPEAKERS.includes(block.speaker.toLowerCase().trim())
      const hasMoment = block.momentAudio || block.moment2Audio

      if (block.audio && voiceRef.current) {
        voiceRef.current.src = `data:audio/mpeg;base64,${block.audio}`
        voiceRef.current.volume = hasMoment ? 0.7 : 1.0
        voiceRef.current.play()
      }

      if (ambienceRef.current) {
        if (block.ambienceAudio) {
          ambienceRef.current.src = `data:audio/mpeg;base64,${block.ambienceAudio}`
          ambienceRef.current.volume = hasMoment ? 0.0 : (block.ambience_volume || 0.3)
          ambienceRef.current.loop = true
          ambienceRef.current.play().catch(err => console.error('Ambience play error:', err))
        } else {
          ambienceRef.current.pause()
          ambienceRef.current.src = ''
        }
      }

      if (ambience2Ref.current) {
        if (block.ambience2Audio) {
          ambience2Ref.current.src = `data:audio/mpeg;base64,${block.ambience2Audio}`
          ambience2Ref.current.volume = hasMoment ? 0.0 : (block.ambience2_volume || 0.3)
          ambience2Ref.current.loop = true
          ambience2Ref.current.play().catch(err => console.error('Ambience2 play error:', err))
        } else {
          ambience2Ref.current.pause()
          ambience2Ref.current.src = ''
        }
      }

      if (momentRef.current) {
        if (block.momentAudio) {
          momentRef.current.src = `data:audio/mpeg;base64,${block.momentAudio}`
          momentRef.current.volume = block.moment_volume || 0.9
          momentRef.current.loop = false
          momentRef.current.play().catch(err => console.error('Moment play error:', err))
        } else {
          momentRef.current.pause()
          momentRef.current.src = ''
        }
      }

      if (moment2Ref.current) {
        if (block.moment2Audio) {
          moment2Ref.current.src = `data:audio/mpeg;base64,${block.moment2Audio}`
          moment2Ref.current.volume = block.moment2_volume || 0.9
          moment2Ref.current.loop = false
          moment2Ref.current.play().catch(err => console.error('Moment2 play error:', err))
        } else {
          moment2Ref.current.pause()
          moment2Ref.current.src = ''
        }
      }

      if (musicRef.current) {
        if (block.musicAudio) {
          const newSrc = `data:audio/mpeg;base64,${block.musicAudio}`
if (!musicRef.current.src || musicRef.current.src === '' || musicRef.current.paused) {
  musicRef.current.src = newSrc
  musicRef.current.loop = true
  musicRef.current.play().catch(err => console.error('Music play error:', err))
}
musicRef.current.volume = hasMoment ? 0.05 : isNarrator ? 0.3 : 0.15
        } else {
          musicRef.current.pause()
          musicRef.current.src = ''
        }
      }
    }
  }, [currentBlock, blocks])

  const handleVoiceEnd = () => {
    const current = blocks[currentBlock]
    const pauseAfter = current?.pause_after || 0
    const momentPause = (current?.momentAudio || current?.moment2Audio) ? 3000 : 0
    const totalPause = Math.max(pauseAfter, momentPause)

    if (totalPause > 0) {
      if (ambienceRef.current && current?.ambienceAudio) {
        ambienceRef.current.volume = 0.6
      }
      if (musicRef.current && current?.musicAudio) {
        musicRef.current.volume = 0.5
      }
      setTimeout(() => {
        playFrom(currentBlock + 1)
      }, totalPause)
    } else {
      playFrom(currentBlock + 1)
    }
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
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎭 AudioDrama</h1>
      <p style={{ color: '#888', marginBottom: '0.5rem' }}>Pride and Prejudice — Chapter I</p>

      {fromCache && (
        <p style={{ color: '#4CAF50', fontSize: '12px', marginBottom: '1.5rem' }}>
          ⚡ Served from cache — no credits used
        </p>
      )}

      <audio ref={voiceRef} onEnded={handleVoiceEnd} style={{ display: 'none' }} />
      <audio ref={ambienceRef} loop style={{ display: 'none' }} />
      <audio ref={ambience2Ref} loop style={{ display: 'none' }} />
      <audio ref={momentRef} style={{ display: 'none' }} />
      <audio ref={moment2Ref} style={{ display: 'none' }} />
      <audio ref={musicRef} loop style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={runFullTest}
          disabled={loading}
          style={{
            background: '#8B0000', color: '#fff', border: 'none',
            padding: '14px 28px', borderRadius: '8px', fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? `Generating block ${generatingIndex + 1}...` : 'Play Pride and Prejudice'}
        </button>

        {blocks.length > 0 && !loading && (
          <button
            onClick={() => isPlaying ? setIsPlaying(false) : playFrom(0)}
            style={{
              background: '#1a5c2e', color: '#fff', border: 'none',
              padding: '14px 28px', borderRadius: '8px', fontSize: '16px', cursor: 'pointer'
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play All'}
          </button>
        )}
      </div>

      {loading && blocks.length === 0 && (
        <div style={{
          background: '#111', border: '1px solid #333', borderRadius: '10px',
          padding: '2rem', textAlign: 'center', color: '#888'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎭</div>
          <p>Generating voices and ambient sounds...</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>Blocks will appear as they generate</p>
        </div>
      )}

      {blocks && blocks.length > 0 && blocks.map((block, i) => (
        <div
          key={i}
          onClick={() => playFrom(i)}
          style={{
            background: currentBlock === i ? '#1a0a0a' : '#111',
            border: currentBlock === i ? '1px solid #8B0000' : '1px solid #333',
            borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem',
            cursor: 'pointer', transition: 'all 0.2s',
            opacity: loading && generatingIndex === i ? 0.6 : 1
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {currentBlock === i && <span style={{ fontSize: '16px' }}>🔊</span>}
            {loading && generatingIndex === i && <span style={{ fontSize: '11px', color: '#888' }}>⏳ generating...</span>}
            <span style={{ background: '#8B0000', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
              {block.speaker}
            </span>
            <span style={{ background: '#1a1a1a', color: '#888', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
              {block.tone}
            </span>
            <span style={{ background: '#1a1a1a', color: '#888', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
              {block.emotion}
            </span>
            {block.ambienceAudio && (
              <span style={{ background: '#0d2d1a', color: '#4CAF50', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                🎵 ambience
              </span>
            )}
            {block.ambience2Audio && (
              <span style={{ background: '#0d2d1a', color: '#4CAF50', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                🎵 ambience 2
              </span>
            )}
            {block.musicAudio && (
              <span style={{ background: '#1a1a2d', color: '#a78bfa', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                🎼 music
              </span>
            )}
            {block.momentAudio && (
              <span style={{ background: '#1a1a2d', color: '#7eb8f7', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                ⚡ moment
              </span>
            )}
            {block.moment2Audio && (
              <span style={{ background: '#1a1a2d', color: '#7eb8f7', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                ⚡ moment 2
              </span>
            )}
            {block.noMatch && (
              <span style={{ background: '#2d1f00', color: '#FFA500', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                ⚠️ No sound found — suggested: {block.suggestion}
              </span>
            )}
          </div>
          <p style={{ color: currentBlock === i ? '#fff' : '#ccc', fontSize: '14px', lineHeight: '1.6', fontStyle: 'italic' }}>
            "{block.line}"
          </p>
        </div>
      ))}
    </main>
  )
}
