export const dynamic = 'force-dynamic'

import { getCachedBlock, cacheBlock } from '@/lib/cache'

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

async function generateAudio(text, voiceId, tone) {
  const toneSettings = {
    normal:     { stability: 0.5, similarity_boost: 0.75, style: 0.3, text: text },
    solemn:     { stability: 0.6, similarity_boost: 0.75, style: 0.3, text: text },
    warm:       { stability: 0.6, similarity_boost: 0.75, style: 0.4, text: text },
    sarcastic:  { stability: 0.4, similarity_boost: 0.75, style: 0.6, text: text },
    excited:    { stability: 0.3, similarity_boost: 0.80, style: 0.7, text: text },
    frantic:    { stability: 0.2, similarity_boost: 0.80, style: 0.8, text: text },
    irritated:  { stability: 0.3, similarity_boost: 0.75, style: 0.7, text: text },
    commanding: { stability: 0.5, similarity_boost: 0.80, style: 0.6, text: text },
    pleading:   { stability: 0.3, similarity_boost: 0.75, style: 0.7, text: text },
    ominous:    { stability: 0.7, similarity_boost: 0.75, style: 0.5, text: text },
    tremble:    { stability: 0.2, similarity_boost: 0.75, style: 0.7, text: text },
    breathless: { stability: 0.2, similarity_boost: 0.75, style: 0.7, text: text },
    exhausted:  { stability: 0.6, similarity_boost: 0.75, style: 0.2, text: text },
    mocking:    { stability: 0.3, similarity_boost: 0.75, style: 0.7, text: text },
    cry:        { stability: 0.2, similarity_boost: 0.80, style: 0.8, text: text },
    shout:      { stability: 0.2, similarity_boost: 0.80, style: 0.9, text: text },
    laugh:      { stability: 0.2, similarity_boost: 0.80, style: 0.8, text: text },
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
        model_id: 'eleven_flash_v2_5',
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

export async function POST(request) {
  try {
    const { blocks, setting, bookId, chapterNumber } = await request.json()

    const results = []

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]

      // Check block cache first
      if (bookId && chapterNumber) {
        const cached = await getCachedBlock(bookId, chapterNumber, i)
        if (cached) {
          console.log(`Block ${i} served from cache`)
          results.push(cached)
          continue
        }
      }

      // Generate voice
      const speakerKey = block.speaker.toLowerCase().trim()
      const voiceId = voiceMap[speakerKey] || voiceMap['narrator']
      const audio = await generateAudio(block.line, voiceId, block.tone)

      // Generate ambience
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://audiodrama.vercel.app'
      const ambienceRes = await fetch(`${baseUrl}/api/ambience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting, line: block.line })
      })

      const ambienceData = ambienceRes.ok ? await ambienceRes.json() : {}

      const result = {
  speaker: block.speaker,
  line: block.line,
  tone: block.tone,
  emotion: block.emotion,
  audio,
  ambienceAudio: ambienceData.audio || null,
  ambience2Audio: ambienceData.audio2 || null,
  ambience_volume: 0.3,
  ambience2_volume: 0.3,
  noMatch: ambienceData.noMatch || false,
  suggestion: ambienceData.suggestion || null,
}

      // Cache the block
      if (bookId && chapterNumber) {
        await cacheBlock(bookId, chapterNumber, i, result)
        console.log(`Block ${i} cached`)
      }

      results.push(result)
    }

    return Response.json({ blocks: results, fromCache: false })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
