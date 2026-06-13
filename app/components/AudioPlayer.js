'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

const NARRATOR_SPEAKERS = ['pp_narrator', 'narrator', 'dracula_narrator']

// Single source of truth for one-shot effect loudness — keep effects
// well under the voice so the narration always stays intelligible
const MOMENT_VOL = 0.35

const BOOK_META = {
  'dracula': {
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Dracula_1st_ed_cover_reproduction.jpg/800px-Dracula_1st_ed_cover_reproduction.jpg',
    color: '#8b0000',
    shareText: "I'm listening to Dracula on Narratescape — immersive AI audio drama 🧛",
  },
  'pride-and-prejudice': {
    image: 'https://m.media-amazon.com/images/I/518cCpQ5lbL._SY445_SX342_FMwebp_.jpg',
    color: '#c47c7c',
    shareText: "I'm listening to Pride and Prejudice on Narratescape — immersive AI audio drama 📖",
  },
}

export default function AudioPlayer({ bookId, chapterNumber, subtitle }) {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [generatingIndex, setGeneratingIndex] = useState(-1)
  const [totalBlocks, setTotalBlocks] = useState(0)
  const [currentBlock, setCurrentBlock] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState(null)
  const [showScenes, setShowScenes] = useState(false)
  const [showVolumes, setShowVolumes] = useState(false)
  const [voiceVol, setVoiceVol] = useState(1.0)
  const [musicVol, setMusicVol] = useState(1.0)
  const [ambienceVol, setAmbienceVol] = useState(1.0)
  const [speed, setSpeed] = useState(1)
  const [beat, setBeat] = useState(0)

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
  const beatRef = useRef(null)
  const momentTimeoutsRef = useRef([])
  const lastTwoMusicRef = useRef([]) // music inertia: only change after 2 consecutive same recommendations

  const clearMomentTimeouts = () => {
    momentTimeoutsRef.current.forEach(id => clearTimeout(id))
    momentTimeoutsRef.current = []
  }

  const scheduleMoment = (ref, audioData, vol, delaySeconds, maxDuration = 12) => {
    if (!ref.current || !audioData) return
    const ms = Math.round((delaySeconds || 0) * 1000)

    // Preload the audio immediately so it's ready to play with no decode delay
    ref.current.src = `data:audio/mpeg;base64,${audioData}`
    ref.current.volume = 0
    ref.current.loop = false
    ref.current.load()

    const id = setTimeout(() => {
      if (!ref.current) return
      ref.current.volume = vol
      ref.current.play().catch(() => {})
      // Auto-stop after maxDuration seconds so long files don't drag on
      const stopId = setTimeout(() => {
        if (!ref.current) return
        const fadeId = setInterval(() => {
          if (!ref.current || ref.current.volume <= 0.05) {
            clearInterval(fadeId)
            if (ref.current) {
              ref.current.pause()
              ref.current.volume = vol
            }
          } else {
            ref.current.volume = Math.max(0, ref.current.volume - 0.1)
          }
        }, 80)
      }, maxDuration * 1000)
      momentTimeoutsRef.current.push(stopId)
    }, ms)
    momentTimeoutsRef.current.push(id)
  }

  const meta = BOOK_META[bookId] || BOOK_META['dracula']
  const storageKey = `narratescape-${bookId}-ch${chapterNumber}`

  // Waveform beat animation while playing
  useEffect(() => {
    if (isPlaying) {
      beatRef.current = setInterval(() => setBeat(b => (b + 1) % 8), 120)
    } else {
      clearInterval(beatRef.current)
      setBeat(0)
    }
    return () => clearInterval(beatRef.current)
  }, [isPlaying])

  // Apply volume changes live
  useEffect(() => {
    if (voiceRef.current) voiceRef.current.volume = voiceVol
  }, [voiceVol])
  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVol * (activeMusicTrackRef.current ? 0.6 : 0)
  }, [musicVol])
  useEffect(() => {
    if (ambienceRef.current && ambienceRef.current.src) ambienceRef.current.volume = ambienceVol * 0.25
    if (ambience2Ref.current && ambience2Ref.current.src) ambience2Ref.current.volume = ambienceVol * 0.3
    if (momentRef.current && momentRef.current.src) momentRef.current.volume = ambienceVol * MOMENT_VOL
    if (moment2Ref.current && moment2Ref.current.src) moment2Ref.current.volume = ambienceVol * MOMENT_VOL
  }, [ambienceVol])

  // Apply speed changes live
  useEffect(() => {
    if (voiceRef.current) voiceRef.current.playbackRate = speed
  }, [speed])

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

  const fadeOutMoment = (ref, durationMs = 3000) => {
    if (!ref.current || ref.current.paused) return
    const startVol = ref.current.volume
    const steps = 20
    const interval = durationMs / steps
    const decrement = startVol / steps
    const id = setInterval(() => {
      if (!ref.current || ref.current.volume <= 0.02) {
        clearInterval(id)
        if (ref.current) { ref.current.pause(); ref.current.removeAttribute('src'); ref.current.load() }
      } else {
        ref.current.volume = Math.max(0, ref.current.volume - decrement)
      }
    }, interval)
    fadeIntervalsRef.current.push(id)
  }

  const pauseAllAudio = () => {
    clearAllFades()
    clearMomentTimeouts()
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

  const playFrom = useCallback((index) => {
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
      localStorage.removeItem(storageKey)
      return
    }
    setCurrentBlock(index)
    setIsPlaying(true)
    localStorage.setItem(storageKey, String(index))
  }, [blocks.length, storageKey])

  const handlePlayPause = useCallback(() => {
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
  }, [isPlaying, currentBlock, playFrom])

  const runFullTest = useCallback(async (clearCache = false) => {
    // Only a literal `true` clears the cache — guards against event objects
    // being passed in as the first argument from onClick handlers
    if (clearCache === true) {
      try {
        await fetch('/api/clear-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, chapterNumber })
        })
      } catch {}
    }
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
    localStorage.removeItem(storageKey)

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

      // Get the whole-chapter sound plan in one GPT call
      const planRes = await fetch('/api/soundplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: allBlocks, setting, bookId, chapterNumber })
      })
      const planData = planRes.ok ? await planRes.json() : { blockMap: {} }
      const blockMap = planData.blockMap || {}

      for (let i = 0; i < allBlocks.length; i++) {
        setGeneratingIndex(i)
        const stitchRes = await fetch('/api/stitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: [allBlocks[i]],
            bookId, chapterNumber,
            blockIndex: i,
            preplannedSound: blockMap[i] || {}
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
  }, [bookId, chapterNumber, storageKey])

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (blocks.length === 0 && !loading) { runFullTest(); return }
        handlePlayPause()
      }
      if (e.code === 'ArrowRight' && currentBlock < blocks.length - 1 && !loading) playFrom(currentBlock + 1)
      if (e.code === 'ArrowLeft' && currentBlock > 0 && !loading) playFrom(currentBlock - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [blocks, currentBlock, loading, handlePlayPause, playFrom, runFullTest])

  useEffect(() => {
    if (currentBlock >= 0 && blocks[currentBlock] && isPlaying) {
      const block = blocks[currentBlock]
      const isNarrator = NARRATOR_SPEAKERS.includes(block.speaker.toLowerCase().trim())
      const hasMoment = block.momentAudio || block.moment2Audio

      const playVoice = () => {
        if (block.audio && voiceRef.current) {
          voiceRef.current.src = `data:audio/mpeg;base64,${block.audio}`
          voiceRef.current.volume = voiceVol
          voiceRef.current.playbackRate = speed
          voiceRef.current.play()
        }
      }
      if (block.pause_before > 0) {
        setTimeout(playVoice, block.pause_before)
      } else {
        playVoice()
      }

      if (ambienceRef.current) {
        if (block.ambienceAudio) {
          const newSrc = `data:audio/mpeg;base64,${block.ambienceAudio}`
          if (activeAmbienceSrcRef.current !== newSrc) {
            activeAmbienceSrcRef.current = newSrc
            const targetVol = ambienceVol * (block.ambience_volume || 0.25)
            ambienceRef.current.src = newSrc
            ambienceRef.current.volume = 0
            ambienceRef.current.loop = true
            ambienceRef.current.play().catch(() => {})
            const fadeIn = setInterval(() => {
              if (ambienceRef.current && ambienceRef.current.volume < targetVol - 0.01) {
                ambienceRef.current.volume = Math.min(targetVol, ambienceRef.current.volume + 0.02)
              } else { clearInterval(fadeIn); if (ambienceRef.current) ambienceRef.current.volume = targetVol }
            }, 50)
            fadeIntervalsRef.current.push(fadeIn)
          } else {
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
            ambience2Ref.current.volume = hasMoment ? 0 : ambienceVol * (block.ambience2_volume || 0.3)
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

      // Fire moment sounds at their specific delay times within the line.
      // Delays are estimates from the sound plan — clamp them to the real
      // voice duration so a sound cued near the end of a line still fires
      // before the block advances (which cancels pending timers).
      clearMomentTimeouts()
      const scheduleBlockMoments = () => {
        const dur = voiceRef.current?.duration
        const playDur = dur && isFinite(dur) ? dur / (speed || 1) : null
        const clampDelay = (d) => playDur ? Math.min(d, Math.max(0, playDur - 2)) : d

        if (block.momentAudio) {
          scheduleMoment(momentRef, block.momentAudio, MOMENT_VOL * ambienceVol, clampDelay(block.moment1_delay || 0))
        } else fadeOutMoment(momentRef, 3000)

        if (block.moment2Audio) {
          scheduleMoment(moment2Ref, block.moment2Audio, MOMENT_VOL * ambienceVol, clampDelay(block.moment2_delay || 0))
        } else fadeOutMoment(moment2Ref, 3000)
      }

      if (block.audio && voiceRef.current && voiceRef.current.readyState < 1) {
        voiceRef.current.addEventListener('loadedmetadata', scheduleBlockMoments, { once: true })
      } else {
        scheduleBlockMoments()
      }

      if (musicRef.current) {
        const newTrack = block.musicTrack || '/music/light_normal.mp3'
        const baseVol = hasMoment ? 0.2 : isNarrator ? 0.6 : 0.45
        const targetVol = baseVol * musicVol

        // Music inertia: only switch tracks if 2 consecutive blocks recommend the same new track
        const last2 = lastTwoMusicRef.current
        last2.push(newTrack)
        if (last2.length > 2) last2.shift()
        const shouldSwitch = last2.length === 2 && last2[0] === last2[1]
        const effectiveTrack = (shouldSwitch || !activeMusicTrackRef.current) ? newTrack : activeMusicTrackRef.current

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
        } else if (effectiveTrack !== activeMusicTrackRef.current) {
          activeMusicTrackRef.current = effectiveTrack
          const fadeOut = setInterval(() => {
            if (musicRef.current && musicRef.current.volume > 0.02) {
              musicRef.current.volume = Math.max(0, musicRef.current.volume - 0.05)
            } else {
              clearInterval(fadeOut)
              if (musicRef.current) {
                musicRef.current.src = effectiveTrack
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
      if (blocks[nextIndex]) playFrom(nextIndex)
      else if (loading) pauseTimeoutRef.current = setTimeout(advance, 300)
      else playFrom(nextIndex)
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
    if (s.includes('narrator')) return meta.color === '#8b0000' ? '#c9a96e' : '#c9a96e'
    if (s.includes('mrs bennet')) return '#c47c7c'
    if (s.includes('mr bennet')) return '#7c9ec4'
    if (s.includes('dracula')) return '#8b0000'
    if (s.includes('elizabeth')) return '#c47c7c'
    if (s.includes('darcy')) return '#7c9ec4'
    return '#a0856c'
  }

  const formatSpeakerName = (speaker) => {
    return speaker
      .replace('pp_narrator', 'Narrator')
      .replace('dracula_narrator', 'Narrator')
      .replace(/_/g, ' ')
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'Narratescape', text: meta.shareText, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(`${meta.shareText} ${url}`).catch(() => {})
      alert('Link copied to clipboard!')
    }
  }

  const currentBlockData = blocks[currentBlock]
  const isNarratorCurrent = currentBlockData && NARRATOR_SPEAKERS.includes(currentBlockData.speaker?.toLowerCase().trim())
  const loadProgress = totalBlocks > 0 ? (blocks.length / totalBlocks) * 100 : 0

  // Waveform bars
  const bars = [0.4, 0.7, 1.0, 0.6, 0.9, 0.5, 0.8, 0.4]

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

      {/* Background glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: currentBlockData
          ? `radial-gradient(ellipse at 50% 40%, ${getSpeakerColor(currentBlockData.speaker)}18 0%, transparent 65%)`
          : `radial-gradient(ellipse at 50% 40%, ${meta.color}08 0%, transparent 60%)`,
        transition: 'background 2s ease',
        pointerEvents: 'none',
      }} />

      {/* Playback progress bar */}
      {blocks.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '2px', background: '#1a1008', zIndex: 10 }}>
          <div style={{
            height: '100%',
            width: loading
              ? `${loadProgress}%`
              : `${currentBlock >= 0 ? ((currentBlock + 1) / blocks.length) * 100 : 0}%`,
            background: loading
              ? 'linear-gradient(to right, #2a1a0a, #5a3520)'
              : 'linear-gradient(to right, #5a3520, #c9a96e)',
            transition: 'width 0.4s ease',
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

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <a href="/" style={{ fontSize: '10px', letterSpacing: '5px', color: '#8a7050', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', textDecoration: 'none' }}>
            ✦ Narratescape ✦
          </a>
          <div style={{ fontSize: '12px', letterSpacing: '3px', color: '#a08060', textTransform: 'uppercase' }}>
            {subtitle}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ marginBottom: '2rem' }}>
            <img src={meta.image} alt="" style={{ width: '80px', height: '110px', objectFit: 'cover', borderRadius: '4px', opacity: 0.6, marginBottom: '1.5rem' }} />
            <div style={{ color: '#8a7050', fontSize: '13px', letterSpacing: '2px', fontStyle: 'italic', marginBottom: '1rem' }}>
              Preparing the drama...
            </div>
            <div style={{ width: '200px', margin: '0 auto 0.5rem', height: '2px', background: '#1a1008', borderRadius: '1px' }}>
              <div style={{ height: '100%', width: `${loadProgress}%`, background: 'linear-gradient(to right, #5a3520, #c9a96e)', borderRadius: '1px', transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ fontSize: '10px', color: '#6a5035', letterSpacing: '2px' }}>
              {blocks.length} / {totalBlocks || '…'} scenes
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ minHeight: loading ? 0 : '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {error ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#8b3030', fontSize: '13px', letterSpacing: '1px', marginBottom: '1.5rem', fontStyle: 'italic' }}>{error}</div>
              <button onClick={() => runFullTest(false)} style={{ background: 'transparent', border: '1px solid #5a3520', color: '#c9a96e', padding: '10px 24px', borderRadius: '6px', fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Try Again
              </button>
            </div>
          ) : !loading && currentBlockData ? (
            <>
              <div style={{ fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase', color: getSpeakerColor(currentBlockData.speaker), marginBottom: '1.5rem', transition: 'all 0.5s' }}>
                {formatSpeakerName(currentBlockData.speaker)}
              </div>

              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.45rem)', lineHeight: 1.85, color: '#e8dcc8', fontStyle: isNarratorCurrent ? 'normal' : 'italic', margin: 0, textAlign: 'center', letterSpacing: '0.01em', transition: 'all 0.4s', wordBreak: 'break-word' }}>
                {isNarratorCurrent ? currentBlockData.line : `"${currentBlockData.line}"`}
              </p>

              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ fontSize: '10px', letterSpacing: '2px', color: '#8a7050', textTransform: 'uppercase' }}>
                  {currentBlock + 1} / {blocks.length}
                </span>
                <button onClick={() => runFullTest(true)} title="Clear cache and regenerate" style={{ background: 'transparent', border: 'none', color: '#5a4030', fontSize: '11px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase', padding: 0 }}>
                  ↺ Regenerate
                </button>
              </div>
            </>
          ) : !loading && (
            <div style={{ textAlign: 'center' }}>
              <img src={meta.image} alt="" style={{ width: '80px', height: '110px', objectFit: 'cover', borderRadius: '4px', opacity: 0.5, marginBottom: '1.5rem' }} />
              <div style={{ color: '#8a7050', fontSize: 'clamp(12px, 2vw, 13px)', letterSpacing: '2px', fontStyle: 'italic' }}>
                {blocks.length > 0 ? 'Press play to begin' : 'Press ✦ to prepare the drama'}
              </div>
            </div>
          )}
        </div>

        {/* Waveform visualizer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '24px', margin: '1.5rem 0' }}>
          {bars.map((h, i) => (
            <div key={i} style={{
              width: '3px',
              borderRadius: '2px',
              background: meta.color === '#8b0000' ? '#c9a96e' : '#c47c7c',
              opacity: isPlaying ? 0.7 : 0.15,
              height: isPlaying ? `${Math.max(4, h * 24 * (0.5 + 0.5 * Math.sin((beat + i) * 0.9)))}px` : '4px',
              transition: 'height 0.12s ease, opacity 0.3s',
            }} />
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center' }}>
          <button onClick={() => currentBlock > 0 && !loading && playFrom(currentBlock - 1)} disabled={currentBlock <= 0 || loading} style={{ background: 'transparent', border: 'none', color: currentBlock > 0 && !loading ? '#8a6040' : '#2a1a0a', fontSize: '24px', cursor: currentBlock > 0 && !loading ? 'pointer' : 'default', transition: 'color 0.3s', padding: '8px', lineHeight: 1 }}>‹</button>

          <button
            onClick={!loading ? (blocks.length > 0 ? handlePlayPause : () => runFullTest(false)) : undefined}
            disabled={loading}
            style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'linear-gradient(135deg, #2a1a0a, #3d2510)', border: '1px solid #5a3520', color: loading ? '#6a5035' : '#c9a96e', fontSize: blocks.length === 0 || loading ? '14px' : '22px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', boxShadow: isPlaying ? '0 0 24px rgba(180,120,40,0.25)' : 'none', letterSpacing: blocks.length === 0 ? '1px' : '0', fontFamily: 'inherit', flexShrink: 0 }}
          >
            {loading ? '⋯' : blocks.length === 0 ? '✦' : isPlaying ? '⏸' : '▶'}
          </button>

          <button onClick={() => currentBlock < blocks.length - 1 && !loading && playFrom(currentBlock + 1)} disabled={currentBlock >= blocks.length - 1 || loading} style={{ background: 'transparent', border: 'none', color: currentBlock < blocks.length - 1 && !loading ? '#8a6040' : '#2a1a0a', fontSize: '24px', cursor: currentBlock < blocks.length - 1 && !loading ? 'pointer' : 'default', transition: 'color 0.3s', padding: '8px', lineHeight: 1 }}>›</button>
        </div>

        {/* Speed + utility controls */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          {[0.75, 1, 1.25].map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{ background: speed === s ? '#2a1a0a' : 'transparent', border: `1px solid ${speed === s ? '#5a3520' : '#1a1008'}`, color: speed === s ? '#c9a96e' : '#4a3020', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {s}×
            </button>
          ))}

          <button onClick={() => { setShowVolumes(v => !v); setShowScenes(false) }} style={{ background: showVolumes ? '#2a1a0a' : 'transparent', border: `1px solid ${showVolumes ? '#5a3520' : '#1a1008'}`, color: showVolumes ? '#c9a96e' : '#4a3020', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            🔊
          </button>

          {blocks.length > 0 && (
            <button onClick={() => { setShowScenes(v => !v); setShowVolumes(false) }} style={{ background: showScenes ? '#2a1a0a' : 'transparent', border: `1px solid ${showScenes ? '#5a3520' : '#1a1008'}`, color: showScenes ? '#c9a96e' : '#4a3020', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              ≡ Scenes
            </button>
          )}

          <button onClick={handleShare} style={{ background: 'transparent', border: '1px solid #1a1008', color: '#4a3020', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            ↗ Share
          </button>
        </div>

        {/* Volume sliders */}
        {showVolumes && (
          <div style={{ marginTop: '1.25rem', background: '#0f0c08', border: '1px solid #1a1008', borderRadius: '8px', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Voice', value: voiceVol, set: setVoiceVol },
              { label: 'Music', value: musicVol, set: setMusicVol },
              { label: 'Ambience', value: ambienceVol, set: setAmbienceVol },
            ].map(({ label, value, set }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '10px', letterSpacing: '2px', color: '#6a5035', textTransform: 'uppercase', width: '60px', textAlign: 'right' }}>{label}</span>
                <input type="range" min="0" max="1" step="0.05" value={value} onChange={e => set(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#c9a96e', cursor: 'pointer' }} />
                <span style={{ fontSize: '10px', color: '#6a5035', width: '28px' }}>{Math.round(value * 100)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Scene list */}
        {showScenes && blocks.length > 0 && (
          <div style={{ marginTop: '1.25rem', background: '#0f0c08', border: '1px solid #1a1008', borderRadius: '8px', maxHeight: '240px', overflowY: 'auto', textAlign: 'left' }}>
            {blocks.map((b, i) => (
              <button key={i} onClick={() => { playFrom(i); setShowScenes(false) }} style={{ display: 'block', width: '100%', background: i === currentBlock ? '#1a1008' : 'transparent', border: 'none', borderBottom: '1px solid #0f0c08', padding: '0.6rem 1rem', cursor: 'pointer', textAlign: 'left', color: i === currentBlock ? '#c9a96e' : '#6a5035', fontFamily: 'inherit', transition: 'background 0.2s' }}>
                <span style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', marginRight: '0.75rem', opacity: 0.5 }}>{i + 1}</span>
                <span style={{ fontSize: '11px', color: getSpeakerColor(b.speaker), marginRight: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{formatSpeakerName(b.speaker)}</span>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{b.line.slice(0, 50)}{b.line.length > 50 ? '…' : ''}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', color: '#3a2010', fontSize: '10px', letterSpacing: '3px', textAlign: 'center' }}>
          space · ← →
        </div>
        <div style={{ marginTop: '0.75rem', color: '#4a3020', fontSize: '14px', letterSpacing: '8px' }}>❧ ✦ ❧</div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 480px) { main { justify-content: flex-start; padding-top: 3rem; } }
        input[type=range] { -webkit-appearance: none; height: 2px; background: #2a1a0a; border-radius: 1px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #c9a96e; cursor: pointer; }
      `}</style>
    </main>
  )
}
