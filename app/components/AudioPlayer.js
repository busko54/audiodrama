'use client'
import { useState, useRef, useEffect } from 'react'

const NARRATOR_SPEAKERS = ['pp_narrator', 'narrator', 'dracula_narrator']

export default function AudioPlayer({ bookId, chapterNumber, subtitle }) {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [generatingIndex, setGeneratingIndex] = useState(-1)
  const [totalBlocks, setTotalBlocks] = useState(0)
  const [currentBlock, setCurrentBlock] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState(null)
  const voiceRef = useRef(null)
  const ambienceRef = useRef(null)
  const ambience2Ref = useRef(null)
  const momentRef = useRef(null)
  const moment2Ref = useRef(null)
  const musicRef = useRef(null)
  const pauseTimeoutRef = useRef(null)
  const activeMusicTrackRef = useRef(null)
  const activeAmbienceSrcRef = useRef(null)
  const activeAmbience2SrcRef = useRef(null)
  const fadeIntervalsRef = useRef([])

  const clearAllFades = () => {
    fadeIntervalsRef.current.forEach(id => clearInterval(id))
    fadeIntervalsRef.current = []
  }

  const stopAudio = (ref) => {
    if (!ref.current) return
    ref.current.pause()
    ref.current.removeAttribute('src')
    ref.current.load()
  }

  const pauseAllAudio = () => {
    clearAllFades()
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
    setError(null)
    setBlocks([])
    setCurrentBlock(-1)
    setIsPlaying(false)
    setGeneratingIndex(-1)
    setTotalBlocks(0)
    pauseAllAudio()
    activeMusicTrackRef.current = null
    activeAmbienceSrcRef.current = null
    activeAmbience2SrcRef.current = null

    try {
      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterText: '', bookId, chapterNumber })
      })
      if (!parseRes.ok) throw new Error('Failed to load chapter')
      const parseData = await parseRes.json()
      const allBlocks = parseData.blocks
      const setting = parseData.setting
      setTotalBlocks(allBlocks.length)
      const results = []

      for (let i = 0; i < allBlocks.length; i++) {
        setGeneratingIndex(i)
        const stitchRes = await fetch('/api/stitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: [allBlocks[i]], setting,
            bookId, chapterNumber,
            blockIndex: i, previousSpeaker: i > 0 ? allBlocks[i - 1].speaker : null
          })
        })
        if (!stitchRes.ok) throw new Error(`Failed to generate scene ${i + 1}`)
        const stitchData = await stitchRes.json()
        results.push(stitchData.blocks[0])
        setBlocks([...results])
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    }

    setLoading(false)
    setGeneratingIndex(-1)
  }

  const playFrom = (index) => {
    if (index === 0) {
      activeMusicTrackRef.current = null
      activeAmbienceSrcRef.current = null
      activeAmbience2SrcRef.current = null
    }
    if (index >= blocks.length) {
      setIsPlaying(false)
      setCurrentBlock(-1)
      stopAudio(ambienceRef)
      stopAudio(ambience2Ref)
      stopAudio(momentRef)
      stopAudio(moment2Ref)
      stopAudio(musicRef)
      return
    }
    setCurrentBlock(index)
    setIsPlaying(true)
  }

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (blocks.length === 0 && !loading) { runFullTest(); return }
        handlePlayPause()
      }
      if (e.code === 'ArrowRight' && currentBlock < blocks.length - 1 && !loading) {
        playFrom(currentBlock + 1)
      }
      if (e.code === 'ArrowLeft' && currentBlock > 0 && !loading) {
        playFrom(currentBlock - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blocks, currentBlock, isPlaying, loading])

  useEffect(() => {
    if (currentBlock >= 0 && blocks[currentBlock] && isPlaying) {
      const block = blocks[currentBlock]
      const isNarrator = NARRATOR_SPEAKERS.includes(block.speaker.toLowerCase().trim())
      const hasMoment = block.momentAudio || block.moment2Audio

      if (block.audio && voiceRef.current) {
        voiceRef.current.src = `data:audio/mpeg;base64,${block.audio}`
        voiceRef.current.volume = 1.0
        voiceRef.current.play()
      }

      // Ambience continuity: only restart if the track changed
      if (ambienceRef.current) {
        if (block.ambienceAudio) {
          const newSrc = `data:audio/mpeg;base64,${block.ambienceAudio}`
          if (activeAmbienceSrcRef.current !== newSrc) {
            activeAmbienceSrcRef.current = newSrc
            const targetAmbiVol = block.ambience_volume || 0.25
            ambienceRef.current.src = newSrc
            ambienceRef.current.volume = 0
            ambienceRef.current.loop = true
            ambienceRef.current.play().catch(() => {})
            const fadeIn = setInterval(() => {
              if (ambienceRef.current && ambienceRef.current.volume < targetAmbiVol - 0.01) {
                ambienceRef.current.volume = Math.min(targetAmbiVol, ambienceRef.current.volume + 0.02)
              } else { clearInterval(fadeIn); if (ambienceRef.current) ambienceRef.current.volume = targetAmbiVol }
            }, 50)
            fadeIntervalsRef.current.push(fadeIn)
          } else {
            // Same track — just make sure it's playing
            if (ambienceRef.current.paused) ambienceRef.current.play().catch(() => {})
          }
        } else {
          activeAmbienceSrcRef.current = null
          stopAudio(ambienceRef)
        }
      }

      if (ambience2Ref.current) {
        if (block.ambience2Audio) {
          const newSrc2 = `data:audio/mpeg;base64,${block.ambience2Audio}`
          if (activeAmbience2SrcRef.current !== newSrc2) {
            activeAmbience2SrcRef.current = newSrc2
            ambience2Ref.current.src = newSrc2
            ambience2Ref.current.volume = hasMoment ? 0.0 : (block.ambience2_volume || 0.3)
            ambience2Ref.current.loop = true
            ambience2Ref.current.play().catch(() => {})
          } else {
            if (ambience2Ref.current.paused) ambience2Ref.current.play().catch(() => {})
          }
        } else {
          activeAmbience2SrcRef.current = null
          stopAudio(ambience2Ref)
        }
      }

      if (momentRef.current) {
        if (block.momentAudio) {
          momentRef.current.src = `data:audio/mpeg;base64,${block.momentAudio}`
          momentRef.current.volume = block.moment_volume || 0.9
          momentRef.current.loop = false
          momentRef.current.play().catch(() => {})
        } else { stopAudio(momentRef) }
      }

      if (moment2Ref.current) {
        if (block.moment2Audio) {
          moment2Ref.current.src = `data:audio/mpeg;base64,${block.moment2Audio}`
          moment2Ref.current.volume = block.moment2_volume || 0.9
          moment2Ref.current.loop = false
          moment2Ref.current.play().catch(() => {})
        } else { stopAudio(moment2Ref) }
      }

      if (musicRef.current) {
        const newTrack = block.musicTrack || '/music/light_normal.mp3'
        const targetVol = hasMoment ? 0.2 : isNarrator ? 0.6 : 0.45

        if (!activeMusicTrackRef.current) {
          activeMusicTrackRef.current = newTrack
          musicRef.current.src = newTrack
          musicRef.current.loop = true
          musicRef.current.volume = 0
          musicRef.current.play().catch(() => {})
          const fadeIn = setInterval(() => {
            if (musicRef.current && musicRef.current.volume < targetVol - 0.02) {
              musicRef.current.volume = Math.min(targetVol, musicRef.current.volume + 0.05)
            } else { clearInterval(fadeIn); if (musicRef.current) musicRef.current.volume = targetVol }
          }, 50)
          fadeIntervalsRef.current.push(fadeIn)
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
                  } else { clearInterval(fadeIn); if (musicRef.current) musicRef.current.volume = targetVol }
                }, 50)
                fadeIntervalsRef.current.push(fadeIn)
              }
            }
          }, 50)
          fadeIntervalsRef.current.push(fadeOut)
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
    const nextIndex = currentBlock + 1
    const pauseAfter = current?.pause_after || 0

    const advance = () => {
      if (blocks[nextIndex]) {
        playFrom(nextIndex)
      } else if (loading) {
        pauseTimeoutRef.current = setTimeout(advance, 300)
      } else {
        playFrom(nextIndex)
      }
    }

    if (pauseAfter > 0) {
      if (ambienceRef.current) ambienceRef.current.volume = 0.02
      if (ambience2Ref.current) ambience2Ref.current.volume = 0.02
      if (musicRef.current) musicRef.current.volume = 0.02
      pauseTimeoutRef.current = setTimeout(advance, pauseAfter)
    } else if (current?.momentAudio || current?.moment2Audio) {
      pauseTimeoutRef.current = setTimeout(advance, 2500)
    } else {
      advance()
    }
  }

  const getSpeakerColor = (speaker) => {
    const s = speaker?.toLowerCase() || ''
    if (s.includes('narrator')) return '#c9a96e'
    if (s.includes('mrs bennet')) return '#c47c7c'
    if (s.includes('mr bennet')) return '#7c9ec4'
    if (s.includes('dracula')) return '#8b0000'
    return '#a0856c'
  }

  const formatSpeakerName = (speaker) => {
    return speaker.replace('pp_narrator', 'Narrator').replace('dracula_narrator', 'Narrator').replace(/_/g, ' ')
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const currentBlockData = blocks[currentBlock]
  const isNarratorCurrent = currentBlockData && NARRATOR_SPEAKERS.includes(currentBlockData.speaker?.toLowerCase().trim())
  const loadProgress = totalBlocks > 0 ? (blocks.length / totalBlocks) * 100 : 0

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080604',
      color: '#e8dcc8',
      fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: currentBlockData
          ? `radial-gradient(ellipse at 50% 40%, ${getSpeakerColor(currentBlockData.speaker)}11 0%, transparent 60%)`
          : 'radial-gradient(ellipse at 50% 40%, rgba(180,120,40,0.05) 0%, transparent 60%)',
        transition: 'background 2s ease',
        pointerEvents: 'none',
      }} />

      {/* Playback progress bar */}
      {blocks.length > 0 && !loading && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '2px', background: '#1a1008' }}>
          <div style={{
            height: '100%',
            width: `${currentBlock >= 0 ? ((currentBlock + 1) / blocks.length) * 100 : 0}%`,
            background: 'linear-gradient(to right, #5a3520, #c9a96e)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}

      {/* Loading progress bar */}
      {loading && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '2px', background: '#1a1008' }}>
          <div style={{
            height: '100%',
            width: `${loadProgress}%`,
            background: 'linear-gradient(to right, #2a1a0a, #5a3520)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      <audio ref={voiceRef} onEnded={handleVoiceEnd} style={{ display: 'none' }} />
      <audio ref={ambienceRef} loop style={{ display: 'none' }} />
      <audio ref={ambience2Ref} loop style={{ display: 'none' }} />
      <audio ref={momentRef} style={{ display: 'none' }} />
      <audio ref={moment2Ref} style={{ display: 'none' }} />
      <audio ref={musicRef} loop style={{ display: 'none' }} />

      <div style={{ textAlign: 'center', maxWidth: '640px', padding: '2rem', zIndex: 1, width: '100%', boxSizing: 'border-box' }}>

        <div style={{ marginBottom: '3rem' }}>
          <a href="/" style={{
            fontSize: '10px', letterSpacing: '5px', color: '#8a7050',
            textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block',
            textDecoration: 'none',
          }}>
            ✦ Narratescape ✦
          </a>
          <div style={{ fontSize: '12px', letterSpacing: '3px', color: '#a08060', textTransform: 'uppercase' }}>
            {subtitle}
          </div>
        </div>

        <div style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {error ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#8b3030', fontSize: '13px', letterSpacing: '1px', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                {error}
              </div>
              <button onClick={runFullTest} style={{
                background: 'transparent', border: '1px solid #5a3520', color: '#c9a96e',
                padding: '10px 24px', borderRadius: '6px', fontSize: '12px',
                letterSpacing: '2px', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Try Again
              </button>
            </div>
          ) : loading ? (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#8a7050', fontSize: '13px', letterSpacing: '2px', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                Preparing the drama...
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%', maxWidth: '280px', margin: '0 auto 0.75rem', height: '2px', background: '#1a1008', borderRadius: '1px' }}>
                <div style={{
                  height: '100%', width: `${loadProgress}%`,
                  background: 'linear-gradient(to right, #5a3520, #c9a96e)',
                  borderRadius: '1px', transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ fontSize: '10px', color: '#6a5035', letterSpacing: '2px' }}>
                {blocks.length} / {totalBlocks || '…'} scenes
              </div>
            </div>
          ) : currentBlockData ? (
            <>
              <div style={{
                fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase',
                color: getSpeakerColor(currentBlockData.speaker),
                marginBottom: '1.5rem', transition: 'all 0.5s',
              }}>
                {isPlaying && <span style={{ marginRight: '8px', animation: 'pulse 1.5s infinite' }}>♪</span>}
                {formatSpeakerName(currentBlockData.speaker)}
              </div>

              <p style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.45rem)',
                lineHeight: 1.85, color: '#e8dcc8',
                fontStyle: isNarratorCurrent ? 'normal' : 'italic',
                margin: 0, textAlign: 'center',
                letterSpacing: '0.01em', transition: 'all 0.4s',
                wordBreak: 'break-word',
              }}>
                {isNarratorCurrent ? currentBlockData.line : `"${currentBlockData.line}"`}
              </p>

              <div style={{ marginTop: '2rem', fontSize: '10px', letterSpacing: '2px', color: '#8a7050', textTransform: 'uppercase' }}>
                {currentBlock + 1} / {blocks.length}
              </div>
            </>
          ) : (
            <div style={{ color: '#8a7050', fontSize: 'clamp(12px, 2vw, 13px)', letterSpacing: '2px', fontStyle: 'italic' }}>
              {blocks.length > 0 ? 'Press play to begin' : 'Press ✦ to prepare the drama'}
            </div>
          )}
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => currentBlock > 0 && !loading && playFrom(currentBlock - 1)}
            disabled={currentBlock <= 0 || loading}
            aria-label="Previous"
            style={{
              background: 'transparent', border: 'none',
              color: currentBlock > 0 && !loading ? '#8a6040' : '#2a1a0a',
              fontSize: '24px', cursor: currentBlock > 0 && !loading ? 'pointer' : 'default',
              transition: 'color 0.3s', padding: '8px', lineHeight: 1,
            }}
          >
            ‹
          </button>

          <button
            onClick={!loading ? (blocks.length > 0 ? handlePlayPause : runFullTest) : undefined}
            disabled={loading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: '68px', height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2a1a0a, #3d2510)',
              border: '1px solid #5a3520',
              color: loading ? '#6a5035' : '#c9a96e',
              fontSize: blocks.length === 0 || loading ? '14px' : '22px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s',
              boxShadow: isPlaying ? '0 0 24px rgba(180,120,40,0.25)' : 'none',
              letterSpacing: blocks.length === 0 ? '1px' : '0',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {loading ? '⋯' : blocks.length === 0 ? '✦' : isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => currentBlock < blocks.length - 1 && !loading && playFrom(currentBlock + 1)}
            disabled={currentBlock >= blocks.length - 1 || loading}
            aria-label="Next"
            style={{
              background: 'transparent', border: 'none',
              color: currentBlock < blocks.length - 1 && !loading ? '#8a6040' : '#2a1a0a',
              fontSize: '24px', cursor: currentBlock < blocks.length - 1 && !loading ? 'pointer' : 'default',
              transition: 'color 0.3s', padding: '8px', lineHeight: 1,
            }}
          >
            ›
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', color: '#3a2510', fontSize: '11px', letterSpacing: '3px', textAlign: 'center' }}>
          space · ← →
        </div>

        <div style={{ marginTop: '1rem', color: '#4a3020', fontSize: '14px', letterSpacing: '8px' }}>
          ❧ ✦ ❧
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 480px) {
          main { justify-content: flex-start; padding-top: 3rem; }
        }
      `}</style>
    </main>
  )
}
