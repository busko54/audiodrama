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
  'dress rustle': '365855',
}

const musicTracks = {
  'regency-light': '/music/light_normal.mp3',
  'regency-tense': '/music/dramatic.mp3',
  'regency-romantic': '/music/romantic.mp3',
}

async function pickSounds(setting, line, speaker, previousSpeaker, tone, emotion) {
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
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `You are an audio drama sound designer. Return a JSON object with six fields:
- "background1": the best looping background sound for the SETTING from this list: ${backgroundKeys}. You MUST always return a value here, never null.
- "background2": a second optional looping background sound from the same list, or null.
- "moment1": a one-shot sound effect from this list: ${momentKeys}. You are a professional audio drama sound designer. Use your judgment to pick sounds that fit the MEANING and CONTEXT of the line, not just explicit keywords. Think about what a Hollywood sound designer would add to make this scene cinematic. Rules in priority order:
* ARRIVALS & TRAVEL IN PERIOD SETTINGS (Regency, Victorian, Gothic, pre-1900): If the line mentions, implies, or references someone arriving, departing, travelling, visiting, or coming to a place — return "horse carriage" as moment1 AND "horse neighing" as moment2. This includes: "comes into the neighbourhood", "arrived", "coming to stay", "visit him", "settled here", "coming down", "set out", "journey", "took possession", or any explicit mention of horse, carriage, chaise, or riding. Only apply this rule if the overall setting is pre-1900. Do NOT apply for modern settings.  * DOORS & ENTRIES: If the line mentions or implies someone entering a room, a door opening or closing, or someone being shown in — return "door creaking"
  * MOVEMENT: If the line mentions or implies walking, pacing, approaching, or footsteps — return "footsteps"
  * CHURCH & CEREMONY: If the line mentions church, bells, wedding, Sunday, prayer, or ceremony — return "church bells"
  * WEATHER EVENTS: If the line mentions or implies lightning, a strike, a flash, or a storm crack — return "lightning"
  * CHARACTER ENTRANCES: If a female character is speaking for the first time after a narrator line AND the previous speaker was a narrator — return "dress rustle" to signal her physical presence entering or turning
  * SILENCE & DISMISSAL: If a narrator line describes a character ignoring someone, making no answer, or sitting in deliberate silence — return null
  * Use your full reasoning ability. If a sound would obviously enhance this moment based on context, setting, and period — use it. If nothing fits naturally — return null.
- "moment2": a second one-shot sound from the same list, or null. Only populate this when the horse rule above applies.
- "music": choose from this list: ${musicKeys}. Use the tone and emotion fields to decide:
  * tone is "frantic" OR tone is "shout" OR emotion is "irritated" OR emotion is "desperate" OR emotion is "terrified" OR emotion is "fearful" OR emotion is "horrified" — return "regency-tense"
  * tone is "pleading" OR emotion is "anxious" — return "regency-tense"
  * tone is "warm" OR emotion is "warm" OR emotion is "awestruck" — return "regency-romantic"
  * all other tones and emotions — return "regency-light"
  * NEVER return null
- "pause_after": a pause duration in milliseconds. Use 1800 if the line describes a character ignoring someone, making no answer, or there is a dramatic silence moment. Use 0 for all other lines.
The setting drives background sounds. The tone and emotion fields directly determine the music choice.
Return ONLY valid JSON. No markdown. No backticks.`
        },
        {
          role: 'user',
          content: `Setting: ${setting}
Line: ${line}
Speaker: ${speaker}
Previous speaker: ${previousSpeaker || 'none'}
Tone: ${tone || 'normal'}
Emotion: ${emotion || 'neutral'}`
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
      music: musicTracks[parsed.music] ? parsed.music : 'regency-light',
      pause_after: parsed.pause_after || 0,
      noMatch: !backgroundSounds[parsed.background1],
      suggestion: parsed.suggestion || null
    }
  } catch (e) {
    console.error('JSON parse error:', e.message, 'Raw text:', text)
    return { background1: null, background2: null, moment1: null, moment2: null, music: 'regency-light', pause_after: 0, noMatch: true, suggestion: null }
  }
}

async function fetchFreesound(soundId) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const infoRes = await fetch(
      `https://freesound.org/apiv2/sounds/${soundId}/`,
      {
        headers: { 'Authorization': `Token ${process.env.FREESOUND_API_KEY}` },
        signal: controller.signal
      }
    )

    if (!infoRes.ok) { clearTimeout(timeout); return null }

    const info = await infoRes.json()
    const previewUrl = info.previews['preview-hq-mp3'] || info.previews['preview-lq-mp3']

    const audioRes = await fetch(previewUrl, { signal: controller.signal })
    clearTimeout(timeout)

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
    const { setting, line, speaker, previousSpeaker, tone, emotion } = await request.json()

    const picked = await pickSounds(setting, line, speaker, previousSpeaker, tone, emotion)

    const [audio, audio2, momentAudio, moment2Audio] = await Promise.all([
      picked.background1 ? fetchFreesound(backgroundSounds[picked.background1]) : Promise.resolve(null),
      picked.background2 ? fetchFreesound(backgroundSounds[picked.background2]) : Promise.resolve(null),
      picked.moment1 ? fetchFreesound(momentSounds[picked.moment1]) : Promise.resolve(null),
      picked.moment2 ? fetchFreesound(momentSounds[picked.moment2]) : Promise.resolve(null),
    ])

    return Response.json({
      audio,
      audio2,
      momentAudio,
      moment2Audio,
      musicTrack: musicTracks[picked.music],
      pause_after: picked.pause_after,
      noMatch: picked.noMatch,
      suggestion: picked.suggestion
    })

  } catch (error) {
    console.error('Ambience route error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
