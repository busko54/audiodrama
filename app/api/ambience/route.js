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
          content: `You are a disciplined BBC radio drama sound designer. Your guiding principle: LESS IS MORE. Silence and restraint are more powerful than constant noise. A sound effect that fires at exactly the right moment is worth ten random ones.

Return a JSON object with these fields:

"background1": A looping ambient background that matches the physical location. Choose from: ${backgroundKeys}.
  • EXCEPTION: Short journal headers, datelines, memos, or title lines under 12 words with no action (e.g. "Jonathan Harker's Journal", "3rd May. Bistritz.", "Mem., get recipe for Mina.") → return "fireplace quiet". These are near-silence moments.
  • For all other lines, pick the sound that best matches WHERE the scene is set. If indoors at night → "fireplace" or "candle ambience". If outside in bad weather → "heavy rain" or "thunder storm". If travelling → "carriage interior".
  • NEVER return null — always pick the location sound.

"background2": A second ambient layer ONLY if it genuinely adds depth (e.g. rain on windows + fireplace together). Return null most of the time.

"moment1": A one-shot sound effect. THIS IS THE MOST IMPORTANT FIELD. Be very conservative — only add a sound if it will genuinely enhance the scene. Most lines should return null.
  Only use sounds for these situations:
  • SHORT MEMO/JOURNAL HEADER (matches background1 exception): "quill writing", fired at the start
  • KNOCKING on a door: "door knock"
  • DOOR OPENING/CLOSING explicitly described: "door creaking"
  • ANGRY EXIT / DOOR SLAMMED: "door slam"
  • FOOTSTEPS explicitly described (walking across room, pacing): "footsteps indoor" or "footsteps gravel"
  • STAIRS explicitly described: "stairs creak"
  • HORSE/CARRIAGE explicitly arriving or departing in a pre-1900 setting: "horse carriage"
  • LIGHTNING explicitly described: "lightning crack"
  • THUNDER explicitly described: "thunder boom"
  • CHURCH BELLS explicitly mentioned: "church bells"
  • CLOCK STRIKING explicitly mentioned: "clock chime"
  • WRITING A LETTER OR JOURNAL explicitly described: "quill writing"
  • TOAST / RAISING A GLASS explicitly described: "glass clink toast"
  • FEMALE CHARACTER first appearance after narrator line: "dress rustle"
  • DEATH / BODY FALLING explicitly described: "body fall"
  • CROWD REACTING explicitly described: "crowd gasp" or "crowd cheer"
  • If none of these apply exactly → return null. Do NOT add sounds just because a line mentions travel in general, or has any mild action.

"moment1_delay": How many seconds into the line the sound should fire. This is critical for realism — the sound must play at the exact moment the action happens in the sentence, not at the beginning.
  Examples:
  • "He crossed the room and opened the door" — door creak fires near the end, delay = 3.5
  • "She knocked twice before entering" — knock fires at the start, delay = 0.3
  • "Suddenly, lightning split the sky" — lightning fires on "lightning", delay = 1.2
  • "Jonathan Harker's Journal" — quill fires immediately, delay = 0.0
  Estimate based on where in the sentence the action occurs. Average speech rate is ~130 words/minute.

"moment2": Second one-shot sound, or null. Only for horse carriage arrival (add "horse neighing" as moment2).
"moment2_delay": Delay in seconds for moment2. Usually moment1_delay + 1.0 for the horse pair.

"music": Choose from: ${musicKeys}
  • Danger, confrontation, fear, horror, desperation, frantic energy → "regency-tense"
  • Love, admiration, longing, warmth, beauty → "regency-romantic"
  • Everything else → "regency-light"
  NEVER return null.

"pause_after": Silence in ms AFTER the line. Use 2000 for deliberate silence/ignoring/shocking revelation. Use 1200 for dramatic speech endings or scene exits. Use 0 otherwise.
"pause_before": Silence in ms BEFORE the line plays. Use 800 only before a genuinely shocking line that needs a beat. Use 0 otherwise.

Return ONLY valid JSON. No markdown. No backticks.`
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
      background1: backgroundSounds[parsed.background1] ? parsed.background1 : 'fireplace quiet',
      background2: backgroundSounds[parsed.background2] ? parsed.background2 : null,
      moment1: momentSounds[parsed.moment1] ? parsed.moment1 : null,
      moment1_delay: parsed.moment1_delay || 0,
      moment2: momentSounds[parsed.moment2] ? parsed.moment2 : null,
      moment2_delay: parsed.moment2_delay || 0,
      music: musicTracks[parsed.music] ? parsed.music : 'regency-light',
      pause_after: parsed.pause_after || 0,
      pause_before: parsed.pause_before || 0,
      noMatch: false,
    }
  } catch (e) {
    console.error('JSON parse error:', e.message, 'Raw text:', text)
    return { background1: 'fireplace quiet', background2: null, moment1: null, moment1_delay: 0, moment2: null, moment2_delay: 0, music: 'regency-light', pause_after: 0, pause_before: 0, noMatch: true }
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
      moment1_delay: picked.moment1_delay,
      moment2_delay: picked.moment2_delay,
      noMatch: picked.noMatch,
    })

  } catch (error) {
    console.error('Ambience route error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
