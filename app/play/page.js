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
      results.push(stitchData.blocks[0])
      setBlocks([...results])
    }

    setLoading(false)
    setGeneratingIndex(-1)
  }

  const playFrom = (index) => {
    if (index === 0) activeMusicTrackRef.current = null
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
          ambienceRef.current.play().catch(() => {})
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
          ambience2Ref.current.play().catch(() => {})
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
          momentRef.current.play().catch(() => {})
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
          moment2Ref.current.play().catch(() => {})
        } else {
          moment2Ref.current.pause()
          moment2Ref.current.src = ''
        }
      }

      if (musicRef.current) {
        const newTrack = block.musicTrack || '/music/light_normal.mp3'
        const targetVol = hasMoment ? 0.3 : isNarrator ? 0.6 : 0.45

        if (!activeMusicTrackRef.current) {
          activeMusicTrackRef.current = newTrack
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
          activeMusicTrackRef.current = newTrack
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
      if (ambienceRef.current && current?.ambienceAudio) ambienceRef.current.volume = 0.6
      if (musicRef.current) musicRef.current.volume = 0.7
      pauseTimeoutRef.current = setTimeout(() => playFrom(currentBlock + 1), pauseAfter)
    } else {
      playFrom(currentBlock + 1)
    }
  }

  const getSpeakerColor = (speaker) => {
    const s = speaker.toLowerCase()
    if (s.includes('narrator')) return '#c9a96e'
    if (s.includes('mrs bennet')) return '#c47c7c'
    if (s.includes('mr bennet')) return '#7c9ec4'
    if (s.includes('dracula')) return '#8b0000'
    return '#a0856c'
  }

  const getMusicLabel = (track) => {
    if (!track) return null
    if (track.includes('dramatic')) return 'tense'
    if (track.includes('romantic')) return 'romantic'
    return 'light'
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0d0a07',
      color: '#e8dcc8',
      fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Atmospheric background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 20% 20%, rgba(180,120,40,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(100,30,30,0.08) 0%, transparent 50%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
        pointerEvents: 'none', zIndex: 0, opacity: 0.4
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '6px', color: '#8a6840', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            ✦ Narratescape ✦
          </div>
          <h1 style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 'normal',
            color: '#e8dcc8',
            margin: '0 0 0.5rem',
            letterSpacing: '0.02em',
            fontStyle: 'italic'
          }}>
            Pride and Prejudice
          </h1>
          <div style={{ fontSize: '13px', color: '#6b5840', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Chapter I
          </div>

          {/* Ornamental divider */}
          <div style={{ margin: '1.5rem auto', color: '#5a4030', fontSize: '18px', letterSpacing: '8px' }}>
            ❧ ✦ ❧
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
          <button
            onClick={runFullTest}
            disabled={loading}
            style={{
              background: loading ? 'transparent' : 'linear-gradient(135deg, #2a1a0a, #3d2510)',
              color: loading ? '#5a4030' : '#c9a96e',
              border: `1px solid ${loading ? '#2a1a0a' : '#5a3520'}`,
              padding: '12px 32px',
              borderRadius: '2px',
              fontSize: '13px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s',
            }}
          >
            {loading ? `Conjuring scene ${generatingIndex + 1}...` : '✦ Generate'}
          </button>

          {blocks.length > 0 && !loading && (
            <button
              onClick={handlePlayPause}
              style={{
                background: isPlaying ? 'linear-gradient(135deg, #1a0a0a, #2d1010)' : 'linear-gradient(135deg, #0a1a0a, #102d10)',
                color: isPlaying ? '#c47c7c' : '#7caa7c',
                border: `1px solid ${isPlaying ? '#3d1515' : '#153d15'}`,
                padding: '12px 32px',
                borderRadius: '2px',
                fontSize: '13px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.3s',
              }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play All'}
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && blocks.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            border: '1px solid #2a1a0a',
            borderRadius: '2px',
            background: 'rgba(20,12,4,0.6)',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '1rem', opacity: 0.6 }}>📜</div>
            <div style={{ color: '#8a6840', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              The drama is being prepared...
            </div>
            <div style={{ color: '#4a3020', fontSize: '12px', marginTop: '8px' }}>
              Voices, ambience, and music are being summoned
            </div>
          </div>
        )}

        {/* Audio elements */}
        <audio ref={voiceRef} onEnded={handleVoiceEnd} style={{ display: 'none' }} />
        <audio ref={ambienceRef} loop style={{ display: 'none' }} />
        <audio ref={ambience2Ref} loop style={{ display: 'none' }} />
        <audio ref={momentRef} style={{ display: 'none' }} />
        <audio ref={moment2Ref} style={{ display: 'none' }} />
        <audio ref={musicRef} loop style={{ display: 'none' }} />

        {/* Blocks */}
        {blocks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {blocks.map((block, i) => {
              const active = currentBlock === i && isPlaying
              const generating = loading && generatingIndex === i
              const isNarrator = NARRATOR_SPEAKERS.includes(block.speaker.toLowerCase().trim())
              const speakerColor = getSpeakerColor(block.speaker)
              const musicLabel = getMusicLabel(block.musicTrack)

              return (
                <div
                  key={i}
                  onClick={() => { setIsPlaying(true); playFrom(i) }}
                  style={{
                    position: 'relative',
                    padding: '1.25rem 1.5rem',
                    cursor: 'pointer',
                    background: active
                      ? 'linear-gradient(135deg, rgba(180,120,40,0.12), rgba(140,80,20,0.08))'
                      : 'transparent',
                    borderLeft: active ? `2px solid ${speakerColor}` : '2px solid transparent',
                    borderBottom: '1px solid rgba(90,60,30,0.15)',
                    transition: 'all 0.3s',
                    opacity: generating ? 0.5 : 1,
                  }}
                >
                  {/* Active glow */}
                  {active && (
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px',
                      background: `linear-gradient(to bottom, transparent, ${speakerColor}, transparent)`,
                      filter: 'blur(4px)',
                    }} />
                  )}

                  {/* Speaker row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                    {active && (
                      <span style={{ fontSize: '10px', color: speakerColor, animation: 'pulse 1.5s infinite' }}>
                        ♪
                      </span>
                    )}
                    {generating && (
                      <span style={{ fontSize: '10px', color: '#5a4030' }}>⋯</span>
                    )}

                    {/* Speaker name */}
                    <span style={{
                      fontSize: '10px',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      color: speakerColor,
                      fontStyle: 'normal',
                    }}>
                      {block.speaker.replace('pp_narrator', 'Narrator').replace('_', ' ')}
                    </span>

                    {/* Tone */}
                    <span style={{
                      fontSize: '9px',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: '#4a3420',
                      padding: '1px 6px',
                      border: '1px solid #2a1a0a',
                      borderRadius: '1px',
                    }}>
                      {block.tone}
                    </span>

                    {/* Sound badges */}
                    {block.ambienceAudio && (
                      <span style={{ fontSize: '9px', color: '#4a6040', letterSpacing: '1px' }}>
                        ♩ ambience
                      </span>
                    )}
                    {musicLabel && (
                      <span style={{
                        fontSize: '9px',
                        color: musicLabel === 'tense' ? '#7c4040' : musicLabel === 'romantic' ? '#7c6040' : '#4a5a3a',
                        letterSpacing: '1px',
                      }}>
                        ♬ {musicLabel}
                      </span>
                    )}
                    {block.momentAudio && (
                      <span style={{ fontSize: '9px', color: '#5a5a7c', letterSpacing: '1px' }}>
                        ⚡ {block.momentAudio ? 'sfx' : ''}
                      </span>
                    )}
                    {block.noMatch && (
                      <span style={{ fontSize: '9px', color: '#7c5a20', letterSpacing: '1px' }}>
                        ⚠ {block.suggestion}
                      </span>
                    )}
                  </div>

                  {/* Line text */}
                  <p style={{
                    margin: 0,
                    fontSize: isNarrator ? '14px' : '15px',
                    lineHeight: 1.75,
                    color: active ? '#e8dcc8' : '#9a8470',
                    fontStyle: isNarrator ? 'normal' : 'italic',
                    fontWeight: isNarrator ? 'normal' : 'normal',
                    paddingLeft: isNarrator ? '0' : '0',
                    letterSpacing: isNarrator ? '0.01em' : '0',
                    transition: 'color 0.3s',
                  }}>
                    {isNarrator ? block.line : `"${block.line}"`}
                  </p>
                </div>
              )
            })}

            {/* End ornament */}
            {!loading && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#3a2510', fontSize: '16px', letterSpacing: '8px' }}>
                ❧ ✦ ❧
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </main>
  )
}
