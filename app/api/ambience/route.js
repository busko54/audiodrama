export const dynamic = 'force-dynamic'

const backgroundSounds = {
  'fireplace': '572304',
  'crowd murmuring': '381373',
  'ballroom': '187776',
  'birds chirping': '766226',
  'raining': '434109',
  'wind': '196677',
  'thunder rumbling': '578236',
  'wolves': '753896',
}

const momentSounds = {
  'horse carriage': '631829',
  'door creaking': '195677',
  'footsteps': '572752',
  'church bells': '480014',
  'lightning': '251635',
  'crowd cheering': '678542',
}

const allSounds = { ...backgroundSounds, ...momentSounds }

async function pickSounds(setting, line) {
  const backgroundKeys = Object.keys(backgroundSounds).join(', ')
  const momentKeys = Object.keys(momentSounds).join(', ')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 100,
      messages: [
        {
          role: 'system',
          content: `You are an audio drama sound designer. Return a JSON object with three fields:
- "background1": the best looping background sound for the SETTING from this list: ${backgroundKeys}. If nothing fits return null.
- "background2": a second optional looping background sound from the same list, or null.
- "moment": a one-shot sound effect triggered by a specific object or action MENTIONED IN THE LINE from this list: ${momentKeys}. Only return a moment sound if something in the line directly references it (e.g. "chaise and four" = "horse carriage", "door opened" = "door creaking"). If nothing is mentioned return null.
The setting drives background sounds. The line text drives the moment sound.
Return ONLY valid JSON. No markdown. No backticks.`
        },
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
    const parsed = JSON.parse(text)
    return {
      background1: backgroundSounds[parsed.background1] ? parsed.background1 : null,
      background2: backgroundSounds[parsed.background2] ? parsed.background2 : null,
      moment: momentSounds[parsed.moment] ? parsed.moment : null,
      noMatch: !parsed.background1 && !parsed.background2,
      suggestion: parsed.suggestion || null
    }
  } catch {
    return { background1: null, background2: null, moment: null, noMatch: true, suggestion: null }
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

    const picked = await pickSounds(setting, line)

    const [audio, audio2, momentAudio] = await Promise.all([
      picked.background1 ? fetchFreesound(backgroundSounds[picked.background1]) : Promise.resolve(null),
      picked.background2 ? fetchFreesound(backgroundSounds[picked.background2]) : Promise.resolve(null),
      picked.moment ? fetchFreesound(momentSounds[picked.moment]) : Promise.resolve(null),
    ])

    return Response.json({
      audio,
      audio2,
      momentAudio,
      noMatch: picked.noMatch,
      suggestion: picked.suggestion
    })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
