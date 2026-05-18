export const dynamic = 'force-dynamic'

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

async function generateAudio(text, voiceId, tone) {
  const toneSettings = {
    whisper:    { stability: 0.25, style: 0.1 },
    normal:     { stability: 0.5,  style: 0.3 },
    commanding: { stability: 0.85, style: 0.6 },
    ominous:    { stability: 0.7,  style: 0.7 },
    pleading:   { stability: 0.3,  style: 0.6 },
    frantic:    { stability: 0.15, style: 0.8 },
    shout:      { stability: 0.2,  style: 0.9 },
    laugh:      { stability: 0.3,  style: 0.7 },
    cry:        { stability: 0.2,  style: 0.8 },
    tremble:    { stability: 0.2,  style: 0.6 },
    mocking:    { stability: 0.5,  style: 0.7 },
    breathless: { stability: 0.25, style: 0.5 },
    solemn:     { stability: 0.75, style: 0.5 },
    cold:       { stability: 0.9,  style: 0.2 },
    warm:       { stability: 0.6,  style: 0.4 },
    sarcastic:  { stability: 0.5,  style: 0.8 },
    exhausted:  { stability: 0.4,  style: 0.3 },
    excited:    { stability: 0.2,  style: 0.9 },
  }

  const settings = toneSettings[tone] || toneSettings['normal']

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: {
          stability: settings.stability,
          similarity_boost: 0.75,
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
    const { blocks } = await request.json()

    const results = []

    for (const block of blocks) {
      const speakerKey = block.speaker.toLowerCase().trim()
      const voiceId = voiceMap[speakerKey] || voiceMap['narrator']
      
      const audio = await generateAudio(block.line, voiceId, block.tone)
      
      results.push({
        speaker: block.speaker,
        line: block.line,
        tone: block.tone,
        emotion: block.emotion,
        ambience: block.ambience,
        audio: audio
      })
    }

    return Response.json({ blocks: results })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
