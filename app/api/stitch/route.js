export const dynamic = 'force-dynamic'

import { getCachedChapter, cacheChapter, uploadAudio } from '@/lib/cache'

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

  const enhancements = {
    'clock': 'clock tower bells striking midnight, twelve deep resonant chimes echoing',
    'midnight': 'clock tower bells striking midnight, twelve deep resonant chimes',
    'wolves': 'pack of wolves howling in the dark night, eerie and terrifying',
    'wind': 'cold mountain wind howling through pine trees and rocks at night',
    'thunder': 'distant thunder rumbling over mountains, low and ominous',
    'horses': 'horse hooves galloping fast on dirt road, carriage wheels rattling',
    'crowd': 'crowd of people murmuring and whispering nervously',
    'silence': 'complete eerie silence, deep ambient quiet',
    'snow': 'blizzard wind with snow, cold winter storm howling',
    'castle': 'dark castle ambient, wind through stone corridors',
    'dog': 'dog howling mournfully in the night, long agonised wail',
    'fire': 'crackling fire burning, wood popping',
    'rain': 'heavy rain falling, storm outside',
    'panic': 'panicked breathing, running footsteps, wolves snarling close',
  }

  const lower = ambienceText.toLowerCase()
  let enhancedPrompt = ambienceText
  for (const [keyword, enhanced] of Object.entries(enhancements)) {
    if (lower.includes(keyword)) {
      enhancedPrompt = enhanced
      break
    }
  }

  const response = await fetch(
    'https://api.elevenlabs.io/v1/sound-generation',
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: enhancedPrompt,
        duration_seconds: 10,
        prompt_influence: 0.5
      })
    }
  )

  if (!response.ok) return null

  const audioBuffer = await response.arrayBuffer()
  return Buffer.from(audioBuffer).toString('base64')
}

export async function POST(request) {
  try {
    const { blocks, bookId, chapterNumber } = await request.json()

    // Check cache first
    if (bookId && chapterNumber) {
      const cached = await getCachedChapter(bookId, chapterNumber)
      if (cached) {
        console.log('Serving from cache:', bookId, chapterNumber)
        return Response.json({ blocks: cached.blocks, fromCache: true })
      }
    }

    // Not cached — generate everything
    const results = []

    for (const block of blocks) {
      const speakerKey = block.speaker.toLowerCase().trim()
      const voiceId = voiceMap[speakerKey] || voiceMap['narrator']
      
      const [audio, ambienceAudio] = await Promise.all([
        generateAudio(block.line, voiceId, block.tone, block.emotion),
        generateAmbience(block.ambience)
      ])
      
      results.push({
        speaker: block.speaker,
        line: block.line,
        tone: block.tone,
        emotion: block.emotion,
        ambience: block.ambience,
        ambience_volume: block.ambience_volume || 0.25,
        audio: audio,
        ambienceAudio: ambienceAudio
      })
    }

    // Cache the results
    if (bookId && chapterNumber) {
      await cacheChapter(bookId, chapterNumber, results, '')
      console.log('Cached:', bookId, chapterNumber)
    }

    return Response.json({ blocks: results, fromCache: false })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
