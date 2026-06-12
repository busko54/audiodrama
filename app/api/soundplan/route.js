export const dynamic = 'force-dynamic'

const backgroundSounds = {
  // Interior
  'fireplace':            '572304',
  'fireplace quiet':      '60105',
  'grandfather clock':    '56240',
  'rain on windows':      '346642',
  'wind howling':         '196677',
  'candle ambience':      '399983',
  'tavern interior':      '381373',
  'inn common room':      '381373',
  'church interior':      '411090',
  'library silence':      '345152',
  'dining room':          '321087',
  'ballroom orchestra':   '187776',
  'carriage interior':    '431277',
  'cellar ambience':      '394561',
  'train interior':       '457602',
  // Exterior
  'birds chirping':       '766226',
  'countryside':          '346633',
  'heavy rain':           '434109',
  'thunder storm':        '578236',
  'wolves howling':       '753896',
  'night insects':        '416079',
  'forest ambience':      '521575',
  'wind in trees':        '339985',
  'horse stable':         '404553',
  'mountain wind':        '531920',
  'city street':          '339812',
  'train station':        '339812',
  // Atmosphere
  'tension drone':        '531915',
  'gothic atmosphere':    '487669',
  'eerie night':          '519863',
}

const momentSounds = {
  // Transport
  'train whistle':        '811510',
  'train passing':        '365917',
  'horse carriage':       '631829',
  'horse neighing':       '655262',
  'horse hooves':         '523896',
  // Doors & movement
  'door creaking':        '195677',
  'door knock':           '242740',
  'door slam':            '264594',
  'footsteps indoor':     '572752',
  'footsteps street':     '166306',
  'footsteps gravel':     '396895',
  'stairs creak':         '399823',
  // Animals
  'dog howling':          '443046',
  'wolves close':         '378334',
  // Weather
  'lightning crack':      '251635',
  'thunder boom':         '398032',
  'wind gust':            '395806',
  // Eating & drinking
  'eating chewing':       '594666',
  'drinking gulping':     '411172',
  'spoon bowl':           '395267',
  // Social & attention
  'waiter whistle':       '499650',
  'finger snap':          '399833',
  'church bells':         '480014',
  'clock chime':          '411888',
  'crowd gasp':           '267696',
  'glass clink toast':    '394467',
  // Writing & reading
  'quill writing':        '399710',
  'book pages':           '399817',
  // Dramatic
  'dress rustle':         '365855',
  'body fall':            '370220',
  'scream distant':       '427600',
}

const musicTracks = {
  'light':    '/music/light_normal.mp3',
  'tense':    '/music/dramatic.mp3',
  'romantic': '/music/romantic.mp3',
}

export const BACKGROUND_SOUNDS = backgroundSounds
export const MOMENT_SOUNDS = momentSounds
export const MUSIC_TRACKS = musicTracks

export async function POST(request) {
  try {
    const { blocks, setting } = await request.json()

    const blockSummary = blocks.map((b, i) =>
      `[${i}] ${b.speaker}: "${b.line.slice(0, 150)}${b.line.length > 150 ? '...' : ''}" (tone: ${b.tone || 'normal'}, emotion: ${b.emotion || 'neutral'})`
    ).join('\n')

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
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `You are a BBC radio drama sound designer planning the complete soundscape for an audio drama chapter. You read the ENTIRE chapter before making any decisions. Think like a film sound editor.

CORE PRINCIPLES:
• Ambience sets the LOCATION and holds steady until the character physically moves somewhere new
• Sound effects are SPARSE — aim for 5-10 total per chapter, each at a specific meaningful moment
• The delay field is crucial — the sound must fire at the exact WORD where the action happens, not at the start of the line
• Music changes slowly, 2-4 times per chapter maximum

Return a JSON object with three arrays:

"scenes": Covers all blocks with consistent ambience per physical location.
  { "from": 0, "to": 5, "background1": "train interior", "background2": null, "music": "light" }
  background1 options: ${backgroundKeys}
  music options: ${musicKeys}
  MUST cover every block from 0 to ${blocks.length - 1} with no gaps.

"moments": Specific one-shot effects, 5-10 max for the whole chapter.
  { "blockIndex": 2, "sound": "train whistle", "delay": 0.5, "sound2": null, "delay2": null }
  sound options: ${momentKeys}
  delay = seconds into the line when the action word is spoken (use ~130 words/min to estimate)

  TRIGGER RULES — only fire when the action is EXPLICITLY in the text:
  • Train departing/arriving/whistling → "train whistle" or "train passing"
  • Walking through streets/city explicitly → "footsteps street" at the word "walk"
  • Dog howling described → "dog howling"
  • Eating food described → "eating chewing" when narrator describes eating
  • Drinking described → "drinking gulping" when narrator describes drinking
  • Calling a waiter/summoning someone → "waiter whistle" or "finger snap"
  • Wolves/wild animals described close by → "wolves close"
  • Door opens/closes → "door creaking"
  • Someone knocks → "door knock"
  • Horse carriage arrives/departs → "horse carriage" + "horse neighing"
  • Lightning/thunder explicitly described → "lightning crack" or "thunder boom"
  • Writing in journal → "quill writing" at delay 0
  • Short journal header (under 10 words) → "quill writing" at delay 0
  • Music shift: when the MOOD of the scene shifts (darker, more dangerous, more romantic) — handle this via the scenes array by starting a new scene with the new music key, not via moments

  TIMING EXAMPLES:
  • "Left Munich at 8:35 in the evening" — train whistle at delay 0.3 (right at the start, he's on the train)
  • "I could walk through the streets" — footsteps street at delay ~3.5 (fires on the word "walk")
  • "There was a dog howling all night" — dog howling at delay 1.0 (fires on "dog howling")
  • "I had for dinner a chicken" — eating chewing at delay ~2.5 (fires when he starts eating)
  • "I asked the waiter" — waiter whistle at delay 0.5
  • "one of the wildest portions of Europe" — no sound, this is description not action
  • Scene becomes gothic/darker/dangerous → start a new scene with music: "tense"

"pauses": Dramatic silences.
  { "blockIndex": 5, "pause_before": 0, "pause_after": 1500 }
  Only add when truly needed: shocking reveal, deliberate silence, dramatic exit.

Return ONLY valid JSON. No markdown. No backticks.`
          },
          {
            role: 'user',
            content: `Setting: ${setting}
Total blocks: ${blocks.length}

Full chapter:
${blockSummary}`
          }
        ]
      })
    })

    const data = await response.json()
    const text = data.choices[0].message.content.trim()
    console.log('Sound plan:', text)

    const plan = JSON.parse(text)

    console.log('Sound plan moments:', JSON.stringify(plan.moments))
    console.log('Sound plan scenes:', JSON.stringify(plan.scenes?.slice(0, 5)))

    const blockMap = {}
    for (let i = 0; i < blocks.length; i++) {
      const scene = plan.scenes.find(s => i >= s.from && i <= s.to)
      const moment = plan.moments?.find(m => m.blockIndex === i)
      const pause = plan.pauses?.find(p => p.blockIndex === i)

      const moment1Valid = momentSounds[moment?.sound]
      const moment2Valid = momentSounds[moment?.sound2]

      if (moment) {
        console.log(`Block ${i} moment: sound="${moment.sound}" valid=${!!moment1Valid} id=${momentSounds[moment.sound]}`)
      }

      blockMap[i] = {
        background1: backgroundSounds[scene?.background1] ? scene.background1 : 'fireplace quiet',
        background2: backgroundSounds[scene?.background2] ? scene.background2 : null,
        music: musicTracks[scene?.music] ? scene.music : 'light',
        moment1: moment1Valid ? moment.sound : null,
        moment1_delay: moment?.delay || 0,
        moment2: moment2Valid ? moment.sound2 : null,
        moment2_delay: moment?.delay2 || 0,
        pause_before: pause?.pause_before || 0,
        pause_after: pause?.pause_after || 0,
      }
    }

    return Response.json({ plan, blockMap })

  } catch (error) {
    console.error('Sound plan error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
