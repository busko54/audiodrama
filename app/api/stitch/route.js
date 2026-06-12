export const dynamic = 'force-dynamic'

import { getCachedBlock, cacheBlock } from '@/lib/cache'
import { BACKGROUND_SOUNDS, MOMENT_SOUNDS, MUSIC_TRACKS } from '@/app/api/soundplan/route'

const voiceMap = {
  'narrator':          'DEvZo8VdnUy6pZ4CSwUB',
  'jonathan harker':   'DEvZo8VdnUy6pZ4CSwUB',
  'jonathan':          'DEvZo8VdnUy6pZ4CSwUB',
  'old landlady':      'H3A1fZxF1QDywkfaNUAm',
  'unknown woman':     'H3A1fZxF1QDywkfaNUAm',
  'landlady':          'H3A1fZxF1QDywkfaNUAm',
  'villager':          'H3A1fZxF1QDywkfaNUAm',
  'counts driver':     'SJxWsMKCCRpKoTtslZWp',
  'driver':            'SJxWsMKCCRpKoTtslZWp',
  "count's driver":    'SJxWsMKCCRpKoTtslZWp',
  'count dracula':     'SJxWsMKCCRpKoTtslZWp',
  'mrs bennet':        'uPfISICOmessSVoItPEY',
  'mr bennet':         'aZgwaz5nPkvcODbZNhwr',
  'pp_narrator':       'ELIjLe2oDKEQ7K9QQmd4',
  'dracula_narrator':  'mfxPGiKweaQEsXJix2Ve',
}

async function generateAudio(text, voiceId, tone) {
  const toneSettings = {
    normal:     { stability: 0.5, similarity_boost: 0.75, style: 0.3, text },
    solemn:     { stability: 0.6, similarity_boost: 0.75, style: 0.3, text },
    warm:       { stability: 0.6, similarity_boost: 0.75, style: 0.4, text },
    sarcastic:  { stability: 0.4, similarity_boost: 0.75, style: 0.6, text },
    excited:    { stability: 0.3, similarity_boost: 0.80, style: 0.7, text },
    frantic:    { stability: 0.2, similarity_boost: 0.80, style: 0.8, text },
    irritated:  { stability: 0.3, similarity_boost: 0.75, style: 0.7, text },
    commanding: { stability: 0.5, similarity_boost: 0.80, style: 0.6, text },
    pleading:   { stability: 0.3, similarity_boost: 0.75, style: 0.7, text },
    ominous:    { stability: 0.7, similarity_boost: 0.75, style: 0.5, text },
    tremble:    { stability: 0.4, similarity_boost: 0.75, style: 0.5, text },
    breathless: { stability: 0.4, similarity_boost: 0.75, style: 0.5, text },
    exhausted:  { stability: 0.6, similarity_boost: 0.75, style: 0.2, text },
    mocking:    { stability: 0.3, similarity_boost: 0.75, style: 0.7, text },
    cry:        { stability: 0.2, similarity_boost: 0.80, style: 0.8, text },
    shout:      { stability: 0.2, similarity_boost: 0.80, style: 0.9, text },
    laugh:      { stability: 0.2, similarity_boost: 0.80, style: 0.8, text },
    whisper:    { stability: 0.7, similarity_boost: 0.75, style: 0.2, text: `<whisper>${text}</whisper>` },
  }

  const settings = toneSettings[tone] || toneSettings.normal

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: settings.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarity_boost,
          style: settings.style,
          use_speaker_boost: true
        }
      })
    }
  )

  if (!response.ok) return null
  const audioBuffer = await response.arrayBuffer()
  return Buffer.from(audioBuffer).toString('base64')
}

async function fetchFreesound(soundId) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const infoRes = await fetch(
      `https://freesound.org/apiv2/sounds/${soundId}/`,
      { headers: { 'Authorization': `Token ${process.env.FREESOUND_API_KEY}` }, signal: controller.signal }
    )
    if (!infoRes.ok) { clearTimeout(timeout); return null }

    const info = await infoRes.json()
    const previewUrl = info.previews['preview-hq-mp3'] || info.previews['preview-lq-mp3']
    const audioRes = await fetch(previewUrl, { signal: controller.signal })
    clearTimeout(timeout)
    if (!audioRes.ok) return null

    const buffer = await audioRes.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
  } catch {
    return null
  }
}

export async function POST(request) {
  try {
    const { blocks, bookId, chapterNumber, blockIndex, preplannedSound } = await request.json()

    const results = []

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const actualIndex = blockIndex ?? i

      if (bookId && chapterNumber) {
        const cached = await getCachedBlock(bookId, chapterNumber, actualIndex)
        if (cached) {
          console.log(`Block ${actualIndex} served from cache`)
          results.push(cached)
          continue
        }
      }

      const speakerKey = block.speaker.toLowerCase().trim()
      const voiceId = voiceMap[speakerKey] || voiceMap['narrator']

      // Fetch voice + all sounds in parallel
      const soundPlan = preplannedSound || {}
      const bg1Id = BACKGROUND_SOUNDS[soundPlan.background1]
      const bg2Id = BACKGROUND_SOUNDS[soundPlan.background2]
      const m1Id = MOMENT_SOUNDS[soundPlan.moment1]
      const m2Id = MOMENT_SOUNDS[soundPlan.moment2]

      if (m1Id) console.log(`Block ${actualIndex}: fetching moment1 "${soundPlan.moment1}" id=${m1Id}`)
      if (m2Id) console.log(`Block ${actualIndex}: fetching moment2 "${soundPlan.moment2}" id=${m2Id}`)

      const [audio, ambienceAudio, ambience2Audio, momentAudio, moment2Audio] = await Promise.all([
        generateAudio(block.line, voiceId, block.tone),
        bg1Id ? fetchFreesound(bg1Id) : Promise.resolve(null),
        bg2Id ? fetchFreesound(bg2Id) : Promise.resolve(null),
        m1Id  ? fetchFreesound(m1Id)  : Promise.resolve(null),
        m2Id  ? fetchFreesound(m2Id)  : Promise.resolve(null),
      ])

      if (m1Id) console.log(`Block ${actualIndex}: moment1 fetch result=${momentAudio ? 'OK' : 'FAILED'}`)

      const musicKey = soundPlan.music || 'light'
      const musicTrack = { light: '/music/light_normal.mp3', tense: '/music/dramatic.mp3', romantic: '/music/romantic.mp3' }[musicKey] || '/music/light_normal.mp3'

      const result = {
        speaker: block.speaker,
        line: block.line,
        tone: block.tone,
        emotion: block.emotion,
        audio,
        ambienceAudio,
        ambience2Audio,
        momentAudio,
        moment2Audio,
        musicTrack,
        moment1_delay: soundPlan.moment1_delay || 0,
        moment2_delay: soundPlan.moment2_delay || 0,
        pause_before: soundPlan.pause_before || 0,
        pause_after: soundPlan.pause_after || 0,
        ambience_volume: 0.25,
        ambience2_volume: 0.25,
        moment_volume: 0.85,
        moment2_volume: 0.85,
      }

      if (bookId && chapterNumber) {
        await cacheBlock(bookId, chapterNumber, actualIndex, result)
        console.log(`Block ${actualIndex} cached`)
      }

      results.push(result)
    }

    return Response.json({ blocks: results })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
