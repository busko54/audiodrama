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
  const pauseTimeoutRef = useRef(null)
  const musicTrackCountRef = useRef({ track: null, count: 0 })
  const activeMusicTrackRef = useRef(null)

  const pauseAllAudio = () => {
    if (voiceRef.current) voiceRef.current.pause()
    if (ambienceRef.current) ambienceRef.current.pause()
    if (ambience2Ref.current) ambience2Ref.current.pause()
    if (momentRef.current) momentRef.current.pause()
    if (moment2Ref.current) moment2Ref.current.pause()
    if (musicRef.current) musicRef.current.pause()
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
  }

  const resumeAllAudio = () => {
    if (voiceRef.current && voiceRef.current.src) voiceRef.current.play().catch(() => {})
    if (ambienceRef.current && ambienceRef.current.src) ambienceRef.current.play().catch(() => {})
    if (ambience2Ref.current && ambience2Ref.current.src) ambience2Ref.current.play().catch(() => {})
    if (musicRef.current && musicRef.current.src) musicRef.current.play().catch(() => {})
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAllAudio()
      setIsPlaying(false)
    } else {
      if (currentBlock >= 0) {
        resumeAllAudio()
        setIsPlaying(true)
      } else {
        playFrom(0)
      }
    }
  }

  const runFullTest = async () => {
    setLoading(true)
    setBlocks([])
    setCurrentBlock(-1)
    setIsPlaying(false)
    setGeneratingIndex(-1)
    pauseAllAudio()
    activeMusicTrackRef.current = null
    musicTrackCountRef.current = { track: null, count: 0 }

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
    if (index === 0) {
      activeMusicTrackRef.current = null
      musicTrackCountRef.current = { track: null, count: 0 }
    }
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
    if (currentBlock >= 0 && blocks[currentBlock] && isPlaying) {
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

      // Music — only switch after 3 consecutive blocks with same new track
      if (musicRef.current) {
        const newTrack = block.musicTrack || '/music/light_normal.mp3'
        const targetVol = hasMoment ? 0.3 : isNarrator ? 0.6 : 0.45

        if (!activeMusicTrackRef.current) {
          // First block — start music immediately
          activeMusicTrackRef.current = newTrack
          musicTrackCountRef.current = { track: newTrack, count: 0 }
          musicRef.current.src = newTrack
          musicRef.current.loop = true
          musicRef.current.volume = 0
          musicRef.current.play().catch(() => {})
          const fadeIn = setInterval(() => {
            if (musicRef.current && musicRef.current.volume < targetVol - 0.02) {
              musicRef.current.volume = Math.min(targetVol, musicRef.current.volume + 0.05)
            } else {
              clearInterval(fadeIn)
              if (musicRef.current) musicRef.current.volume = targetVol
            }
          }, 50)
        } else if (newTrack !== activeMusicTrackRef.current) {
          // Track wants to change — count consecutive blocks
          if (musicTrackCountRef.current.track === newTrack) {
            musicTrackCountRef.current.count += 1
          } else {
            musicTrackCountRef.current = { track: newTrack, count: 1 }
          }

          // Only switch after 3 consecutive blocks requesting new track
          if (musicTrackCountRef.current.count >= 3) {
            activeMusicTrackRef.current = newTrack
            musicTrackCountRef.current = { track: newTrack, count: 0 }
            const fadeOut = setInterval(() => {
              if (musicRef.current && musicRef.current.volume > 0.02) {
                musicRef.current.volume = Math.max(0, musicRef.current.volume - 0.05)
              } else {
                clearInterval(fadeOut)
                if (musicRef.current) {
                  musicRef.current.src = newTrack
                  musicRef.current.loop = true
                  musicRef.current.play().catch(() => {})
                  musicRef.current.volume = 0
                  const fadeIn = setInterval(() => {
                    if (musicRef.current && musicRef.current.volume < targetVol - 0.02) {
                      musicRef.current.volume = Math.min(targetVol, musicRef.current.volume + 0.05)
                    } else {
                      clearInterval(fadeIn)
                      if (musicRef.current) musicRef.current.volume = targetVol
                    }
                  }, 50)
                }
              }
            }, 50)
          } else {
            // Keep current track playing, just adjust volume
            if (musicRef.current.paused) musicRef.current.play().catch(() => {})
            musicRef.current.volume = targetVol
          }
        } else {
          // Same track — reset count and keep playing
          musicTrackCountRef.current = { track: newTrack, count: 0 }
          if (musicRef.current.paused) musicRef.current.play().catch(() => {})
          musicRef.current.volume = targetVol
        }
      }
    }
  }, [currentBlock, blocks, isPlaying])

  const handleVoiceEnd = () => {
    if (!isPlaying) return
    const current = blocks[currentBlock]
    const pauseAfter = current?.pause_after || 0

    if (pauseAfter > 0) {
      if (ambienceRef.current && current?.ambienceAudio) {
        ambienceRef.current.volume = 0.6
      }
      if (musicRef.current) {
        musicRef.current.volume = 0.7
      }
      pauseTimeoutRef.current = setTimeout(() => {
        playFrom(currentBlock + 1)
      }, pauseAfter)
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
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎭 Narratescape</h1>
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
          {loading ? `Generating block ${generatingIndex + 1}...` : 'Generate'}
        </button>

        {blocks.length > 0 && !loading && (
          <button
            onClick={handlePlayPause}
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
          onClick={() => { setIsPlaying(true); playFrom(i) }}
          style={{
            background: currentBlock === i ? '#1a0a0a' : '#111',
            border: currentBlock === i ? '1px solid #8B0000' : '1px solid #333',
            borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem',
            cursor: 'pointer', transition: 'all 0.2s',
            opacity: loading && generatingIndex === i ? 0.6 : 1
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {currentBlock === i && isPlaying && <span style={{ fontSize: '16px' }}>🔊</span>}
            {loading && generatingIndex === i && <span style={{ fontSize: '11px', color: '#888' }}>⏳ generating...</span>}
            <span style={{ background: '#8B0000', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
              {block.speaker}
            </span>
            <span style={{ background: '#1a1a1a', color: '#888', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
              {block.tone}
            </span>
            {block.emotion !== block.tone && (
              <span style={{ background: '#1a1a1a', color: '#888', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                {block.emotion}
              </span>
            )}
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
            {block.musicTrack && (
              <span style={{ background: '#1a1a2d', color: '#a78bfa', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                🎼 {block.musicTrack.includes('dramatic') ? 'tense' : block.musicTrack.includes('romantic') ? 'romantic' : 'light'}
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
