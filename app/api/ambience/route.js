export const dynamic = 'force-dynamic'

const keywordMap = {
  'clock': 'clock chime midnight bells',
  'midnight': 'clock striking midnight chime',
  'wolves': 'wolves howling night forest',
  'wolf': 'wolf howling night',
  'wind': 'wind howling mountain night',
  'thunder': 'thunder storm rumble',
  'horses': 'horse hooves galloping',
  'horse': 'horse hooves carriage',
  'crowd': 'crowd murmur people talking',
  'silence': null,
  'dog': 'dog howling night',
  'fire': 'fire crackling wood burning',
  'rain': 'rain falling storm',
  'train': 'steam train moving tracks',
  'castle': 'wind dark castle eerie',
  'snow': 'blizzard wind snow',
  'creaking': 'wood floor creaking',
  'footsteps': 'footsteps wooden floor indoor',
  'door': 'door creaking opening',
  'sobbing': 'woman crying sobbing',
  'church': 'church bells distant',
  'inn': 'tavern inn ambient quiet',
  'carriage': 'horse carriage moving',
  'whip': 'whip crack horse',
  'screaming': 'crowd screaming panic',
}

function getSearchQuery(ambienceText) {
  if (!ambienceText || ambienceText === 'none') return null
  
  const lower = ambienceText.toLowerCase()
  
  for (const [keyword, query] of Object.entries(keywordMap)) {
    if (lower.includes(keyword)) {
      return query
    }
  }
  
  return ambienceText
}

export async function POST(request) {
  try {
    const { ambienceText } = await request.json()
    
    console.log('Ambience request:', ambienceText)
    
    const searchQuery = getSearchQuery(ambienceText)
    
    console.log('Search query:', searchQuery)
    
    if (!searchQuery) {
      return Response.json({ audio: null })
    }

    const searchRes = await fetch(
      `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(searchQuery)}&fields=id,name,previews,duration&filter=duration:[1+TO+30]&sort=rating_desc&page_size=5`,
      {
        headers: {
          'Authorization': `Token ${process.env.FREESOUND_API_KEY}`
        }
      }
    )

    if (!searchRes.ok) {
      const errText = await searchRes.text()
      console.error('Freesound search failed:', errText)
      return Response.json({ audio: null })
    }

    const searchData = await searchRes.json()
    
    console.log('Freesound results count:', searchData.results?.length)
    console.log('Freesound first result:', searchData.results?.[0]?.name)

    if (!searchData.results || searchData.results.length === 0) {
      console.log('No results found for query:', searchQuery)
      return Response.json({ audio: null })
    }

    const sound = searchData.results[0]
    const previewUrl = sound.previews['preview-hq-mp3'] || sound.previews['preview-lq-mp3']

    console.log('Preview URL:', previewUrl)

    if (!previewUrl) {
      console.log('No preview URL found')
      return Response.json({ audio: null })
    }

    const audioRes = await fetch(previewUrl, {
      headers: {
        'Authorization': `Token ${process.env.FREESOUND_API_KEY}`
      }
    })

    if (!audioRes.ok) {
      console.error('Audio download failed:', audioRes.status)
      return Response.json({ audio: null })
    }

    const audioBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    console.log('Freesound audio fetched successfully:', sound.name, 'for query:', searchQuery)

    return Response.json({ audio: base64Audio })

  } catch (error) {
    console.error('Ambience error:', error.message)
    return Response.json({ audio: null })
  }
}
