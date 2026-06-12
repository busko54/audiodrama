export const dynamic = 'force-dynamic'

const allSounds = {
  // Background
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
  'train interior':       '457602',
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
  'tension drone':        '531915',
  'gothic atmosphere':    '487669',
  'eerie night':          '519863',
  // Moment
  'train whistle':        '268060',
  'train passing':        '507389',
  'horse carriage':       '631829',
  'horse neighing':       '655262',
  'horse hooves':         '523896',
  'door creaking':        '195677',
  'door knock':           '242740',
  'door slam':            '264594',
  'footsteps indoor':     '572752',
  'footsteps street':     '521112',
  'footsteps gravel':     '396895',
  'stairs creak':         '399823',
  'dog howling':          '398073',
  'wolves close':         '395668',
  'lightning crack':      '251635',
  'thunder boom':         '398032',
  'wind gust':            '395806',
  'eating chewing':       '399720',
  'drinking gulping':     '399718',
  'spoon bowl':           '395267',
  'waiter whistle':       '399833',
  'finger snap':          '399833',
  'church bells':         '480014',
  'clock chime':          '411888',
  'crowd gasp':           '267696',
  'glass clink toast':    '394467',
  'quill writing':        '399710',
  'book pages':           '399817',
  'dress rustle':         '365855',
  'body fall':            '370220',
  'scream distant':       '427600',
}

export async function GET() {
  const results = {}

  await Promise.all(
    Object.entries(allSounds).map(async ([name, id]) => {
      try {
        const res = await fetch(
          `https://freesound.org/apiv2/sounds/${id}/`,
          {
            headers: { 'Authorization': `Token ${process.env.FREESOUND_API_KEY}` },
            signal: AbortSignal.timeout(8000)
          }
        )
        if (res.ok) {
          const data = await res.json()
          results[name] = { id, status: 'ok', freesoundName: data.name }
        } else {
          results[name] = { id, status: `fail:${res.status}` }
        }
      } catch (e) {
        results[name] = { id, status: `error:${e.message}` }
      }
    })
  )

  const failed = Object.entries(results).filter(([, v]) => v.status !== 'ok')
  const ok = Object.entries(results).filter(([, v]) => v.status === 'ok')

  return Response.json({ ok: ok.length, failed: failed.length, results })
}
