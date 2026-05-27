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
  'horse neighing': '655262',
  'door creaking': '195677',
  'footsteps': '572752',
  'church bells': '480014',
  'lightning': '251635',
  'crowd cheering': '678542',
}

const musicTracks = {
  'regency classical piano': '727792',
}

async function pickSounds(setting, line, speaker) {
  const backgroundKeys = Object.keys(backgroundSounds).join(', ')
  const momentKeys = Object.keys(momentSounds).join(', ')
  const musicKeys = Object.keys(musicTracks).join(', ')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [
        {
          role: 'system',
          content: `You are an audio drama sound designer. Return a JSON object with five fields:
- "background1": the best looping background sound for the SETTING from this list: ${backgroundKeys}. You MUST always return a value here, never null.
- "background2": a second optional looping background sound from the same list, or null.
- "moment1": a one-shot sound effect triggered by a specific object or action MENTIONED IN THE LINE from this list: ${momentKeys}. Only return if something in the line directly references it. If nothing is mentioned return null.
- "moment2": a second one-shot sound effect from the same moment list, or null. Only use if two distinct moment sounds are clearly referenced in the line.
- "music": the best background music track for the SETTING from this list: ${musicKeys}. Pick the closest match. If nothing fits return null.
The setting drives background and music. The line text drives moment sounds.
Return ONLY valid JSON. No markdown. No backticks.`
        },
        {
          role: 'user',
          content: `Setting: ${setting}\nLine: ${line}\n\nNote: if the line mentions a horse, carriage, or riding, return both "horse carriage" and "horse neighing" as moment1 and moment2.`
        }
      ]
    })
  })

  const data = await response.json()
  const text = data.choices[0].message.content.trim()
  console.log('GPT ambience response:', text)

  try {
    const parsed = JSON.parse(text)
    return {
      background1: backgroundSounds[parsed.background1] ? parsed.background1 : null,
      background2: backgroundSounds[parsed.background2] ? parsed.background2 : null,
      moment1: momentSounds[parsed.moment1] ? parsed.moment1 : null,
      moment2: momentSounds[parsed.moment2] ? parsed.moment2 : null,
      music: musicTracks[parsed.music] ? parsed.music : null,
      noMatch: !backgroundSounds[parsed.background1],
      suggestion: parsed.suggestion || null
    }
  } catch (e) {
    console.error('JSON parse error:', e.message, 'Raw text:', text)
    return { background1: null, background2: null, moment1: null, moment2: null, music: null, noMatch: true, suggestion: null }
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
    const { setting, line, speaker } = await request.json()

    const picked = await pickSounds(setting, line, speaker)

    const [audio, audio2, momentAudio, moment2Audio, musicAudio] = await Promise.all([
      picked.background1 ? fetchFreesound(backgroundSounds[picked.background1]) : Promise.resolve(null),
      picked.background2 ? fetchFreesound(backgroundSounds[picked.background2]) : Promise.resolve(null),
      picked.moment1 ? fetchFreesound(momentSounds[picked.moment1]) : Promise.resolve(null),
      picked.moment2 ? fetchFreesound(momentSounds[picked.moment2]) : Promise.resolve(null),
      picked.music ? fetchFreesound(musicTracks[picked.music]) : Promise.resolve(null),
    ])

    return Response.json({
      audio,
      audio2,
      momentAudio,
      moment2Audio,
      musicAudio,
      noMatch: picked.noMatch,
      suggestion: picked.suggestion
    })

  } catch (error) {
    console.error('Ambience route error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
