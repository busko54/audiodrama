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

async function generateAudio(text, voiceId, tone, emotion) {
  const performancePrompts = {
    whisper:    `[whispered, barely audible] ${text}`,
    frantic:    `[frantically, voice breaking with terror] ${text}`,
    ominous:    `[slow and ominous, each word deliberate] ${text}`,
    pleading:   `[desperately pleading, voice trembling] ${text}`,
    tremble:    `[voice trembling uncontrollably] ${text}`,
    breathless: `[breathless, gasping slightly] ${text}`,
    commanding: `[cold, commanding, utterly authoritative] ${text}`,
    solemn:     `[gravely solemn, low and serious] ${text}`,
    cry:        `[voice breaking, on the verge of tears] ${text}`,
    shout:      `[shouting urgently] ${text}`,
    laugh:      `[laughing slightly as they speak] ${text}`,
    mocking:    `[mockingly, with contempt] ${text}`,
    cold:       `[ice cold, emotionless] ${text}`,
    warm:       `[warmly, gently] ${text}`,
    sarcastic:  `[sarcastically] ${text}`,
    exhausted:  `[exhausted, barely able to speak] ${text}`,
    excited:    `[excitedly, barely containing energy] ${text}`,
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
        model_id: 'eleven_v3',
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

export async function POST(request) {
  try {
    const { blocks } = await request.json()

    const results = []

    for (const block of blocks) {
      const speakerKey = block.speaker.toLowerCase().trim()
      const voiceId = voiceMap[speakerKey] || voiceMap['narrator']
      
      const audio = await generateAudio(block.line, voiceId, block.tone, block.emotion)
      
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
