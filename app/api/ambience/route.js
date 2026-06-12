export const dynamic = 'force-dynamic'

// ── BACKGROUND LOOPS ──────────────────────────────────────────────────────────
const backgroundSounds = {
  // Interior
  'fireplace':            '572304',
  'fireplace quiet':      '60105',
  'grandfather clock':    '56240',
  'rain on windows':      '346642',
  'wind howling':         '196677',
  'candle ambience':      '399983',
  'tavern interior':      '381373',
  'church interior':      '411090',
  'library silence':      '345152',
  'dining room':          '321087',
  'ballroom orchestra':   '187776',
  'carriage interior':    '431277',
  'cellar ambience':      '394561',

  // Exterior
  'birds chirping':       '766226',
  'countryside':          '346633',
  'heavy rain':           '434109',
  'thunder storm':        '578236',
  'wolves howling':       '753896',
  'night insects':        '416079',
  'ocean waves':          '155234',
  'city street 1800s':    '339812',
  'forest ambience':      '521575',
  'wind in trees':        '339985',
  'horse stable':         '404553',
  'harbour docks':        '398728',

  // Atmosphere
  'tension drone':        '531915',
  'eerie silence':        '519863',
  'gothic atmosphere':    '531915',
}

// ── ONE-SHOT MOMENT SOUNDS ────────────────────────────────────────────────────
const momentSounds = {
  // Transport
  'horse carriage':       '631829',
  'horse neighing':       '655262',
  'horse hooves':         '523896',
  'carriage door':        '414913',

  // Doors & movement
  'door creaking':        '195677',
  'door knock':           '242740',
  'door slam':            '264594',
  'footsteps indoor':     '572752',
  'footsteps gravel':     '521112',
  'stairs creak':         '399823',

  // Nature events
  'lightning crack':      '251635',
  'thunder boom':         '398032',
  'rain burst':           '346641',
  'wind gust':            '395806',

  // Social & ceremony
  'church bells':         '480014',
  'clock chime':          '411888',
  'crowd gasp':           '267696',
  'crowd cheer':          '678542',
  'applause':             '263113',
  'glass clink toast':    '394467',
  'quill writing':        '399710',

  // Dramatic
  'dress rustle':         '365855',
  'book pages':           '399817',
  'fire crackle burst':   '398066',
  'candle snuff':         '399984',
  'window shutter':       '414869',
  'sword draw':           '441821',
  'body fall':            '370220',
  'scream distant':       '427600',
}

// ── MUSIC TRACKS ──────────────────────────────────────────────────────────────
const musicTracks = {
  'regency-light':    '/music/light_normal.mp3',
  'regency-tense':    '/music/dramatic.mp3',
  'regency-romantic': '/music/romantic.mp3',
}

// ─────────────────────────────────────────────────────────────────────────────

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
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are a Hollywood audio drama sound designer. Your job is to make every scene feel cinematic and immersive.

Return a JSON object with these fields:

"background1": The primary looping background sound that fits the PHYSICAL SETTING of this scene. Choose from: ${backgroundKeys}. ALWAYS return a value — never null. Think: where are we? Indoors by a fire? Outside in a storm? A ballroom?
  EXCEPTION: If the line is a short title, dateline, header, or chapter marker (e.g. "Jonathan Harker's Journal", "3rd May. Bistritz.", "Chapter I", under 8 words with no action) — return "fireplace quiet" as a very soft background and nothing else. These moments should feel like near-silence.

"background2": A second optional ambient layer that adds depth. Same list. Return null if nothing adds value.

"moment1": A one-shot sound effect triggered by THIS specific line. Choose from: ${momentKeys}. Apply these rules in priority order:
  • TRAVEL/ARRIVAL (pre-1900 settings): any mention of arriving, departing, visiting, journeying, carriages, horses → "horse carriage" + "horse neighing"
  • DOORS: entering a room, door opening/closing, being shown in → "door creaking" or "door knock"
  • KNOCKING: someone knocking, rapping, tapping at a door → "door knock"
  • SLAMMING: anger + door, storming out, violent exit → "door slam"
  • FOOTSTEPS: walking, pacing, approaching, crossing a room → "footsteps indoor" or "footsteps gravel" based on setting
  • STAIRS: going up/downstairs, descending → "stairs creak"
  • LIGHTNING: lightning, flash, electric, struck → "lightning crack"
  • THUNDER: thunder described explicitly → "thunder boom"
  • CHURCH/CEREMONY: bells, wedding, Sunday, prayer → "church bells" or "clock chime"
  • WRITING: writing a letter, journal entry, signing → "quill writing"
  • READING: opening a book, reading a letter → "book pages"
  • TOAST/DRINK: raising a glass, toast, cheers → "glass clink toast"
  • DRAMATIC REVEAL/SHOCK: shocking news, sudden realisation, gasp moment → "crowd gasp"
  • FEMALE CHARACTER ENTRANCE: female character speaks for first time after narrator → "dress rustle"
  • DEATH/VIOLENCE: falling, striking, collapsing → "body fall"
  • DISTANT DANGER: far-off scream, something heard in distance → "scream distant"
  • SILENCE/DISMISSAL: character ignores, makes no reply, deliberate silence → null + set pause_after to 2000
  • If nothing fits naturally → null

"moment2": Second one-shot sound, or null. Use for horse rule (horse carriage + horse neighing together).

"music": Choose from: ${musicKeys}
  • TENSE: tone is frantic/shout/commanding, emotion is terrified/horrified/fearful/desperate/anxious, or scene involves danger/confrontation → "regency-tense"
  • ROMANTIC: tone is warm/solemn, emotion is warm/awestruck/tender, or scene involves love/admiration/longing → "regency-romantic"
  • LIGHT: everything else → "regency-light"
  NEVER return null.

"pause_after": milliseconds of silence AFTER the line ends. Use:
  • 2000 for: character ignores someone, makes no reply, deliberate silence, shocking revelation lands
  • 1200 for: end of a dramatic speech, character exits, scene transition
  • 0 for everything else

"pause_before": milliseconds of silence BEFORE the line plays. Use:
  • 800 for: a shocking line that needs a beat before it lands, a line spoken after a long silence
  • 0 for everything else

Return ONLY valid JSON. No markdown. No backticks. No explanation.`
        },
        {
          role: 'user',
          content: `Setting: ${setting}
Line: "${line}"
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
      pause_before: parsed.pause_before || 0,
      noMatch: !backgroundSounds[parsed.background1],
    }
  } catch (e) {
    console.error('JSON parse error:', e.message, 'Raw text:', text)
    return { background1: null, background2: null, moment1: null, moment2: null, music: 'regency-light', pause_after: 0, pause_before: 0, noMatch: true }
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
      pause_before: picked.pause_before,
      noMatch: picked.noMatch,
    })

  } catch (error) {
    console.error('Ambience route error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
