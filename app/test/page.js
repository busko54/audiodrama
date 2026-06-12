'use client'
import { useState, useRef, useEffect } from 'react'

export default function TestPage() {
  const [bookId, setBookId] = useState('dracula')
  const [chapterNumber, setChapterNumber] = useState(1)
  const [blocks, setBlocks] = useState([])
  const [blockMap, setBlockMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [testingIndex, setTestingIndex] = useState(null)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('')

  const voiceRef = useRef(null)
  const ambienceRef = useRef(null)
  const momentRef = useRef(null)
  const moment2Ref = useRef(null)
  const musicRef = useRef(null)
  const timeoutsRef = useRef([])

  useEffect(() => {
    voiceRef.current = new Audio()
    ambienceRef.current = new Audio()
    momentRef.current = new Audio()
    moment2Ref.current = new Audio()
    musicRef.current = new Audio()
    ambienceRef.current.loop = true
    musicRef.current.loop = true
  }, [])

  const stopAll = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    ;[voiceRef, ambienceRef, momentRef, moment2Ref, musicRef].forEach(r => {
      if (r.current) { r.current.pause(); r.current.removeAttribute('src'); r.current.load() }
    })
  }

  const loadChapter = async () => {
    setLoading(true)
    setStatus('Loading chapter...')
    setBlocks([])
    setBlockMap({})
    setResult(null)
    try {
      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterText: '', bookId, chapterNumber })
      })
      const parseData = await parseRes.json()
      const allBlocks = parseData.blocks

      setStatus('Getting sound plan...')
      const planRes = await fetch('/api/soundplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: allBlocks, setting: parseData.setting, bookId, chapterNumber })
      })
      const planData = await planRes.json()

      setBlocks(allBlocks)
      setBlockMap(planData.blockMap || {})
      setStatus(`Loaded ${allBlocks.length} blocks. Click any line to test it.`)
    } catch (e) {
      setStatus('Error: ' + e.message)
    }
    setLoading(false)
  }

  const testBlock = async (index) => {
    stopAll()
    setTestingIndex(index)
    setResult(null)
    setStatus(`Generating block ${index}...`)

    try {
      const soundPlan = blockMap[index] || {}
      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: [blocks[index]],
          bookId, chapterNumber,
          blockIndex: index,
          preplannedSound: soundPlan,
          skipCache: true
        })
      })
      const data = await res.json()
      const block = data.blocks[0]
      setResult({ block, soundPlan, index })
      setStatus('Playing...')

      // Play voice
      if (block.audio) {
        voiceRef.current.src = `data:audio/mpeg;base64,${block.audio}`
        voiceRef.current.volume = 1.0
        voiceRef.current.play().catch(() => {})
      }

      // Play ambience
      if (block.ambienceAudio) {
        ambienceRef.current.src = `data:audio/mpeg;base64,${block.ambienceAudio}`
        ambienceRef.current.volume = 0.25
        ambienceRef.current.loop = true
        ambienceRef.current.play().catch(() => {})
      }

      // Play music
      if (block.musicTrack) {
        musicRef.current.src = block.musicTrack
        musicRef.current.volume = 0.4
        musicRef.current.loop = true
        musicRef.current.play().catch(() => {})
      }

      // Schedule moment sounds
      if (block.momentAudio) {
        momentRef.current.src = `data:audio/mpeg;base64,${block.momentAudio}`
        momentRef.current.volume = 0
        momentRef.current.load()
        const id = setTimeout(() => {
          momentRef.current.volume = 1.0
          momentRef.current.play().catch(() => {})
          setStatus(`▶ moment sound fired: "${soundPlan.moment1}" at ${soundPlan.moment1_delay}s`)
        }, (soundPlan.moment1_delay || 0) * 1000)
        timeoutsRef.current.push(id)
      }

      if (block.moment2Audio) {
        moment2Ref.current.src = `data:audio/mpeg;base64,${block.moment2Audio}`
        moment2Ref.current.volume = 0
        moment2Ref.current.load()
        const id = setTimeout(() => {
          moment2Ref.current.volume = 1.0
          moment2Ref.current.play().catch(() => {})
          setStatus(`▶ moment2 sound fired: "${soundPlan.moment2}" at ${soundPlan.moment2_delay}s`)
        }, (soundPlan.moment2_delay || 0) * 1000)
        timeoutsRef.current.push(id)
      }

    } catch (e) {
      setStatus('Error: ' + e.message)
    }
  }

  const soundPlanForIndex = (i) => {
    const s = blockMap[i]
    if (!s) return null
    const parts = []
    if (s.background1) parts.push(`bg: ${s.background1}`)
    if (s.music) parts.push(`music: ${s.music}`)
    if (s.moment1) parts.push(`🔔 ${s.moment1} @${s.moment1_delay}s`)
    if (s.moment2) parts.push(`🔔 ${s.moment2} @${s.moment2_delay}s`)
    return parts.join(' · ')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'monospace', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.2rem', letterSpacing: '4px', color: '#c9a96e', marginBottom: '2rem' }}>
        SOUND TEST — one block at a time
      </h1>

      {/* Config */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={bookId} onChange={e => setBookId(e.target.value)}
          style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '8px 12px', borderRadius: '6px', fontFamily: 'monospace' }}>
          <option value="dracula">Dracula</option>
          <option value="pride-and-prejudice">Pride and Prejudice</option>
        </select>
        <select value={chapterNumber} onChange={e => setChapterNumber(Number(e.target.value))}
          style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '8px 12px', borderRadius: '6px', fontFamily: 'monospace' }}>
          <option value={1}>Chapter 1</option>
        </select>
        <button onClick={loadChapter} disabled={loading}
          style={{ background: '#8B0000', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace' }}>
          {loading ? 'Loading...' : 'Load Chapter'}
        </button>
        <button onClick={stopAll}
          style={{ background: '#222', color: '#888', border: '1px solid #333', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace' }}>
          ■ Stop
        </button>
      </div>

      {/* Status */}
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '6px', padding: '10px 16px', marginBottom: '1.5rem', fontSize: '12px', color: '#c9a96e', letterSpacing: '1px' }}>
        {status || 'Press "Load Chapter" to begin.'}
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: '#0d1a0d', border: '1px solid #1a4a1a', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontSize: '12px' }}>
          <div style={{ color: '#4CAF50', marginBottom: '6px' }}>Block {result.index} — {result.block.speaker}</div>
          <div style={{ color: '#888', marginBottom: '8px', lineHeight: 1.6 }}>{result.block.line}</div>
          <div style={{ color: '#555', fontSize: '11px' }}>
            voice: {result.block.audio ? '✓' : '✗'} &nbsp;
            ambience: {result.block.ambienceAudio ? '✓' : '✗'} &nbsp;
            moment1: {result.block.momentAudio ? '✓' : '✗'} ({result.soundPlan.moment1 || 'none'} @{result.soundPlan.moment1_delay}s) &nbsp;
            moment2: {result.block.moment2Audio ? '✓' : '✗'} ({result.soundPlan.moment2 || 'none'})
          </div>
        </div>
      )}

      {/* Block list */}
      {blocks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {blocks.map((block, i) => {
            const plan = soundPlanForIndex(i)
            const hasMoment = blockMap[i]?.moment1
            const isTesting = testingIndex === i
            return (
              <button key={i} onClick={() => testBlock(i)}
                style={{
                  background: isTesting ? '#1a0a00' : '#111',
                  border: `1px solid ${isTesting ? '#8B0000' : hasMoment ? '#3a2a00' : '#1a1a1a'}`,
                  color: '#fff', borderRadius: '6px', padding: '10px 14px',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace',
                  transition: 'border-color 0.2s'
                }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#444', minWidth: '28px', fontSize: '11px' }}>{i}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#8B0000', letterSpacing: '2px', marginBottom: '3px' }}>
                      {block.speaker.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#bbb', lineHeight: 1.5 }}>
                      {block.line.slice(0, 120)}{block.line.length > 120 ? '...' : ''}
                    </div>
                    {plan && (
                      <div style={{ fontSize: '10px', color: '#5a4a00', marginTop: '4px' }}>{plan}</div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}
