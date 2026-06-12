export const dynamic = 'force-dynamic'

const backgroundSounds = {
  'fireplace':          '572304',
  'fireplace quiet':    '60105',
  'grandfather clock':  '56240',
  'rain on windows':    '346642',
  'wind howling':       '196677',
  'candle ambience':    '399983',
  'tavern interior':    '381373',
  'church interior':    '411090',
  'library silence':    '345152',
  'dining room':        '321087',
  'ballroom orchestra': '187776',
  'carriage interior':  '431277',
  'cellar ambience':    '394561',
  'birds chirping':     '766226',
  'countryside':        '346633',
  'heavy rain':         '434109',
  'thunder storm':      '578236',
  'wolves howling':     '753896',
  'night insects':      '416079',
  'forest ambience':    '521575',
  'wind in trees':      '339985',
  'horse stable':       '404553',
  'tension drone':      '531915',
  'gothic atmosphere':  '531915',
}

const momentSounds = {
  'horse carriage':     '631829',
  'horse neighing':     '655262',
  'door creaking':      '195677',
  'door knock':         '242740',
  'door slam':          '264594',
  'footsteps indoor':   '572752',
  'footsteps gravel':   '521112',
  'stairs creak':       '399823',
  'lightning crack':    '251635',
  'thunder boom':       '398032',
  'church bells':       '480014',
  'clock chime':        '411888',
  'crowd gasp':         '267696',
  'crowd cheer':        '678542',
  'glass clink toast':  '394467',
  'quill writing':      '399710',
  'dress rustle':       '365855',
  'book pages':         '399817',
  'body fall':          '370220',
  'scream distant':     '427600',
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
      `[${i}] ${b.speaker}: "${b.line.slice(0, 120)}${b.line.length > 120 ? '...' : ''}" (tone: ${b.tone || 'normal'}, emotion: ${b.emotion || 'neutral'})`
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
            content: `You are a BBC radio drama sound designer planning the complete soundscape for an audio drama chapter. You have read the entire chapter and now make all sound decisions at once, with full context.

Your guiding principles:
• LESS IS MORE. Restraint and silence are more powerful than constant noise.
• Ambience holds for entire scenes — it only changes when the physical location changes.
• Sound effects are rare and precise — maybe 4-8 for a whole chapter, firing at the exact dramatic moment.
• Music shifts slowly — 2-4 changes per chapter, held for extended sections.

Return a JSON object with three arrays:

"scenes": Array of scene objects, each covering a range of blocks with consistent ambience.
  Each scene: { "from": blockIndex, "to": blockIndex, "background1": soundName, "background2": soundNameOrNull, "music": musicKey }
  • background1 from: ${backgroundKeys}
  • background2 is optional — null unless a second layer genuinely adds depth
  • music from: ${musicKeys}
  • Scenes must be contiguous and cover ALL blocks (0 to ${blocks.length - 1})
  • Only create a new scene when the physical location or atmosphere meaningfully changes

"moments": Array of one-shot sound effects — BE VERY SELECTIVE, aim for 4-8 total maximum.
  Each moment: { "blockIndex": number, "sound": soundName, "delay": secondsIntoLine, "sound2": soundNameOrNull, "delay2": secondsOrNull }
  • sound from: ${momentKeys}
  • delay: how many seconds into the spoken line the sound fires (based on where in the sentence the action happens)
  • Only add a moment when an action is EXPLICITLY described: a door opens, someone knocks, a carriage arrives, lightning strikes, etc.
  • Do NOT add sounds for general travel, vague movement, or atmosphere — only explicit physical actions
  • For journal headers/memos (short lines under 10 words): you MAY add "quill writing" at delay 0

"pauses": Array of dramatic pause instructions.
  Each pause: { "blockIndex": number, "pause_before": msOrZero, "pause_after": msOrZero }
  • pause_before: silence before the line (max 800ms) — only for genuinely shocking revelations
  • pause_after: silence after the line (max 2000ms) — for deliberate silence, ignored questions, dramatic exits
  • Only include blocks that actually need a pause — leave out all others

Return ONLY valid JSON. No markdown. No backticks. No explanation.`
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

    // Build a per-block lookup for fast access in stitch
    const blockMap = {}
    for (let i = 0; i < blocks.length; i++) {
      // Find which scene this block belongs to
      const scene = plan.scenes.find(s => i >= s.from && i <= s.to)
      const moment = plan.moments?.find(m => m.blockIndex === i)
      const pause = plan.pauses?.find(p => p.blockIndex === i)

      blockMap[i] = {
        background1: backgroundSounds[scene?.background1] ? scene.background1 : 'fireplace quiet',
        background2: backgroundSounds[scene?.background2] ? scene.background2 : null,
        music: musicTracks[scene?.music] ? scene.music : 'light',
        moment1: momentSounds[moment?.sound] ? moment.sound : null,
        moment1_delay: moment?.delay || 0,
        moment2: momentSounds[moment?.sound2] ? moment.sound2 : null,
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
