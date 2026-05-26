export const dynamic = 'force-dynamic'

const soundMap = {
  'birds chirping': '766226',
  'fireplace': '572304',
  'raining': '434109',
  'lightning': '251635',
  'wind': '196677',
  'crowd cheering': '678542',
  'ballroom': '187776',
  'horse carriage': '631829',
  'church bells': '480014',
  'door creaking': '195677',
  'footsteps': '572752',
  'wolves': '753896',
  'thunder rumbling': '578236',
  'crowd murmuring': '381373',
}

async function pickAmbienceKeys(setting, line) {
  const soundKeys = Object.keys(soundMap).join(', ')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 50,
      messages: [
        {
          role: 'system',
content: `You are an audio drama sound designer. Pick 1 or 2 background ambient sounds that fit the SETTING, not the specific words in the line. The setting is the most important factor. Only pick from this exact list: ${soundKeys}. If none of the sounds are a good fit, return {"noMatch": true, "suggestion": "describe the ideal sound here"} instead. Otherwise return ONLY a JSON array of keys. Example: ["fireplace", "crowd murmuring"]`        },
        {
          role: 'user',
          content: `Setting: ${setting}\nLine: ${line}`
        }
      ]
    })
  })

  const data = await response.json()
  const text = data.choices[0].message.content.trim()

  try {
    const keys = JSON.parse(text)
    return keys.filter(k => soundMap[k])
  } catch {
    return []
  }
}

async function fetchFreesound(soundId) {
  try {
    const infoRes = await fetch(
      `https://freesound.org/apiv2/sounds/${soundId}/`,
      {
        headers: {
          'Authorization': `Token ${process.env.FREESOUND_API_KEY}`
        }
      }
    )

    if (!infoRes.ok) return null

    const info = await infoRes.json()
    const previewUrl = info.previews['preview-hq-mp3'] || info.previews['preview-lq-mp3']

    const audioRes = await fetch(previewUrl)
    if (!audioRes.ok) return null

    const buffer = await audioRes.arrayBuffer()
    return Buffer.from(buffer).toString('base64')

  } catch (error) {
    console.error('Freesound fetch error:', error.message)
    return null
  }
}

export async function POST(request) {
  try {
    const { setting, line } = await request.json()

    const keys = await pickAmbienceKeys(setting, line)

    if (keys.length === 0) {
      return Response.json({ audio: null, audio2: null })
    }

    const [audio, audio2] = await Promise.all([
      keys[0] ? fetchFreesound(soundMap[keys[0]]) : Promise.resolve(null),
      keys[1] ? fetchFreesound(soundMap[keys[1]]) : Promise.resolve(null),
    ])

    return Response.json({ audio, audio2 })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
