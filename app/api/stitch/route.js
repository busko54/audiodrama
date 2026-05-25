export const dynamic = 'force-dynamic'

import { getCachedChapter, cacheChapter } from '@/lib/cache'

const voiceMap = {
  'narrator': 'DEvZo8VdnUy6pZ4CSwUB',
  'jonathan harker': 'DEvZo8VdnUy6pZ4CSwUB',
  'jonathan': 'DEvZo8VdnUy6pZ4CSwUB',
  'old landlady': 'H3A1fZxF1QDywkfaNUAm',
  'unknown woman': 'H3A1fZxF1QDywkfaNUAm',
  'landlady': 'H3A1fZxF1QDywkfaNUAm',
  'villager': 'H3A1fZxF1QDywkfaNUAm',
  'counts driver': 'SJxWsMKCCRpKoTtslZWp',
  'driver': 'SJxWsMKCCRpKoTtslZWp',
  "count's driver": 'SJxWsMKCCRpKoTtslZWp',
  'count dracula': 'SJxWsMKCCRpKoTtslZWp',
  'mrs bennet': 'uPfISICOmessSVoItPEY',
  'mr bennet': 'aZgwaz5nPkvcODbZNhwr',
  'pp_narrator': 'ELIjLe2oDKEQ7K9QQmd4',
}

async function generateAudio(text, voiceId, tone, emotion) {
  const performancePrompts = {
    whisper:    `<whisper>${text}</whisper>`,
    frantic:    text,
    ominous:    text,
    pleading:   text,
    tremble:    text,
    breathless: text,
    commanding: text,
    solemn:     text,
    cry:        text,
    shout:      text,
    laugh:      text,
    mocking:    text,
    cold:       text,
    warm:       text,
    sarcastic:  text,
    exhausted:  text,
    excited:    text,
    normal:     text,
  }

  const directedText = performancePrompts[tone] || text

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: directedText,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    }
  )

  if (!response.ok) return null

  const audioBuffer = await response.arrayBuffer()
  return Buffer.from(audioBuffer).toString('base64')
}

async function generateAmbience(ambienceText) {
  if (!ambienceText || ambienceText === 'none') return null

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://audiodrama.vercel.app'
    const response = await fetch(`${baseUrl}/api/ambience`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambienceText })
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.audio || null

  } catch (error) {
    console.error('Ambience fetch error:', error.message)
    return null
  }
}

export async function POST(request) {
  try {
    const { blocks, bookId, chapterNumber } = await request.json()

    if (bookId && chapterNumber) {
      const cached = await getCachedChapter(bookId, chapterNumber)
      if (cached) {
        console.log('Serving from cache:', bookId, chapterNumber)
        return Response.json({ blocks: cached.blocks, fromCache: true })
      }
    }

    const results = []

    for (const block of blocks) {
      const speakerKey = block.speaker.toLowerCase().trim()
      const voiceId = voiceMap[speakerKey] || voiceMap['narrator']
      
      const [audio, ambienceAudio, ambience2Audio] = await Promise.all([
        generateAudio(block.line, voiceId, block.tone, block.emotion),
        generateAmbience(block.ambience),
        block.ambience2 ? generateAmbience(block.ambience2) : Promise.resolve(null)
      ])
      
      results.push({
        speaker: block.speaker,
        line: block.line,
        tone: block.tone,
        emotion: block.emotion,
        ambience: block.ambience,
        ambience_volume: block.ambience_volume || 0.25,
        ambience2: block.ambience2 || null,
        ambience2_volume: block.ambience2_volume || 0.3,
        audio: audio,
        ambienceAudio: ambienceAudio,
        ambience2Audio: ambience2Audio
      })
    }

    if (bookId && chapterNumber) {
      await cacheChapter(bookId, chapterNumber, results, '')
      console.log('Cached:', bookId, chapterNumber)
    }

    return Response.json({ blocks: results, fromCache: false })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
