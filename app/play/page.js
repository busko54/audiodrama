'use client'
import { useState, useRef, useEffect } from 'react'

const NARRATOR_SPEAKERS = ['pp_narrator', 'narrator']

export default function Home() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [generatingIndex, setGeneratingIndex] = useState(-1)
  const [currentBlock, setCurrentBlock] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const voiceRef = useRef(null)
  const ambienceRef = useRef(null)
  const ambience2Ref = useRef(null)
  const momentRef = useRef(null)
  const moment2Ref = useRef(null)
  const musicRef = useRef(null)
  const pauseTimeoutRef = useRef(null)
  const activeMusicTrackRef = useRef(null)
  const fadeIntervalsRef = useRef([])

  const clearAllFades = () => {
    fadeIntervalsRef.current.forEach(id => clearInterval(id))
    fadeIntervalsRef.current = []
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
    setBlocks([])
    setCurrentBlock(-1)
    setIsPlaying(false)
    setGeneratingIndex(-1)
    pauseAllAudio()
    activeMusicTrackRef.current = null

    const parseRes = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterText: '', bookId: 'dracula', chapterNumber: 1 })
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
          blocks: [allBlocks[i]], setting,
         bookId: 'dracula', chapterNumber: 1,
          blockIndex: i, previousSpeaker: i > 0 ? allBlocks[i - 1].speaker : null
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
        voiceRef.current.volume = 1.0
        voiceRef.current.play()
      }

      if (ambienceRef.current) {
        if (block.ambienceAudio) {
          ambienceRef.current.src = `data:audio/mpeg;base64,${block.ambienceAudio}`
          ambienceRef.current.volume = hasMoment ? 0.0 : (block.ambience_volume || 0.3)
          ambienceRef.current.loop = true
          ambienceRef.current.play().catch(() => {})
        } else { ambienceRef.current.pause(); ambienceRef.current.src = '' }
      }

      if (ambience2Ref.current) {
        if (block.ambience2Audio) {
          ambience2Ref.current.src = `data:audio/mpeg;base64,${block.ambience2Audio}`
          ambience2Ref.current.volume = hasMoment ? 0.0 : (block.ambience2_volume || 0.3)
          ambience2Ref.current.loop = true
          ambience2Ref.current.play().catch(() => {})
        } else { ambience2Ref.current.pause(); ambience2Ref.current.src = '' }
      }

      if (momentRef.current) {
        if (block.momentAudio) {
          momentRef.current.src = `data:audio/mpeg;base64,${block.momentAudio}`
          momentRef.current.volume = block.moment_volume || 0.9
          momentRef.current.loop = false
          momentRef.current.play().catch(() => {})
        } else { momentRef.current.pause(); momentRef.current.src = '' }
      }

      if (moment2Ref.current) {
        if (block.moment2Audio) {
          moment2Ref.current.src = `data:audio/mpeg;base64,${block.moment2Audio}`
          moment2Ref.current.volume = block.moment2_volume || 0.9
          moment2Ref.current.loop = false
          moment2Ref.current.play().catch(() => {})
        } else { moment2Ref.current.pause(); moment2Ref.current.src = '' }
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
    return speaker.replace('pp_narrator', 'Narrator').replace(/_/g, ' ')
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const currentBlockData = blocks[currentBlock]
  const isNarratorCurrent = currentBlockData && NARRATOR_SPEAKERS.includes(currentBlockData.speaker?.toLowerCase().trim())

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

      {blocks.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '2px', background: '#1a1008' }}>
          <div style={{
            height: '100%',
            width: `${currentBlock >= 0 ? ((currentBlock + 1) / blocks.length) * 100 : 0}%`,
            background: 'linear-gradient(to right, #5a3520, #c9a96e)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}

      <audio ref={voiceRef} onEnded={handleVoiceEnd} style={{ display: 'none' }} />
      <audio ref={ambienceRef} loop style={{ display: 'none' }} />
      <audio ref={ambience2Ref} loop style={{ display: 'none' }} />
      <audio ref={momentRef} style={{ display: 'none' }} />
      <audio ref={moment2Ref} style={{ display: 'none' }} />
      <audio ref={musicRef} loop style={{ display: 'none' }} />

      <div style={{ textAlign: 'center', maxWidth: '640px', padding: '2rem', zIndex: 1, width: '100%' }}>

        <div style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '5px', color: '#4a3020', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            ✦ Narratescape ✦
          </div>
          <div style={{ fontSize: '12px', letterSpacing: '3px', color: '#5a4030', textTransform: 'uppercase' }}>
            Pride and Prejudice · Chapter I
          </div>
        </div>

        <div style={{ minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? (
            <div style={{ color: '#3a2510', fontSize: '13px', letterSpacing: '2px', fontStyle: 'italic' }}>
              <div style={{ marginBottom: '0.5rem' }}>The drama is being prepared...</div>
              <div style={{ fontSize: '10px', color: '#2a1a0a', letterSpacing: '2px' }}>
                Scene {generatingIndex + 1} of ~33
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
                fontSize: 'clamp(1.1rem, 2.5vw, 1.45rem)',
                lineHeight: 1.85, color: '#e8dcc8',
                fontStyle: isNarratorCurrent ? 'normal' : 'italic',
                margin: 0, textAlign: 'center',
                letterSpacing: '0.01em', transition: 'all 0.4s',
              }}>
                {isNarratorCurrent ? currentBlockData.line : `"${currentBlockData.line}"`}
              </p>

              <div style={{ marginTop: '2rem', fontSize: '10px', letterSpacing: '2px', color: '#3a2510', textTransform: 'uppercase' }}>
                {currentBlock + 1} / {blocks.length}
              </div>
            </>
          ) : (
            <div style={{ color: '#3a2510', fontSize: '13px', letterSpacing: '2px', fontStyle: 'italic' }}>
              {blocks.length > 0 ? 'Press play to begin' : 'Press ✦ to prepare the drama'}
            </div>
          )}
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => currentBlock > 0 && !loading && playFrom(currentBlock - 1)}
            disabled={currentBlock <= 0 || loading}
            style={{
              background: 'transparent', border: 'none',
              color: currentBlock > 0 && !loading ? '#5a4030' : '#1a1008',
              fontSize: '24px', cursor: currentBlock > 0 && !loading ? 'pointer' : 'default',
              transition: 'color 0.3s', padding: '8px', lineHeight: 1,
            }}
          >
            ‹
          </button>

          <button
            onClick={!loading ? (blocks.length > 0 ? handlePlayPause : runFullTest) : undefined}
            disabled={loading}
            style={{
              width: '68px', height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2a1a0a, #3d2510)',
              border: '1px solid #5a3520',
              color: loading ? '#3a2510' : '#c9a96e',
              fontSize: blocks.length === 0 || loading ? '14px' : '22px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s',
              boxShadow: isPlaying ? '0 0 24px rgba(180,120,40,0.25)' : 'none',
              letterSpacing: blocks.length === 0 ? '1px' : '0',
              fontFamily: 'inherit',
            }}
          >
            {loading ? '⋯' : blocks.length === 0 ? '✦' : isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => currentBlock < blocks.length - 1 && !loading && playFrom(currentBlock + 1)}
            disabled={currentBlock >= blocks.length - 1 || loading}
            style={{
              background: 'transparent', border: 'none',
              color: currentBlock < blocks.length - 1 && !loading ? '#5a4030' : '#1a1008',
              fontSize: '24px', cursor: currentBlock < blocks.length - 1 && !loading ? 'pointer' : 'default',
              transition: 'color 0.3s', padding: '8px', lineHeight: 1,
            }}
          >
            ›
          </button>
        </div>

        <div style={{ marginTop: '2.5rem', color: '#2a1a0a', fontSize: '14px', letterSpacing: '8px' }}>
          ❧ ✦ ❧
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </main>
  )
}
