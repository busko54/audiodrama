export const dynamic = 'force-dynamic'

// Make ambience descriptions more specific for better generation
function enhanceAmbiencePrompt(text) {
  const enhancements = {
    'clock': 'loud clock tower bell striking midnight, twelve deep resonant chimes, echoing',
    'midnight': 'clock tower bells striking midnight, twelve deep resonant chimes echoing in silence',
    'wolves': 'pack of wolves howling in the dark night, distant and eerie, getting closer',
    'wind': 'cold mountain wind howling through pine trees and rocks at night',
    'thunder': 'distant thunder rumbling over mountains, low and ominous',
    'horses': 'horse hooves galloping fast on dirt road, carriage wheels rattling',
    'crowd': 'crowd of people murmuring and whispering nervously',
    'silence': 'complete eerie silence, deep ambient quiet',
    'snow': 'blizzard wind with snow, cold winter storm howling',
    'castle': 'dark castle ambient, wind through stone corridors, eerie silence',
    'dog': 'dog howling mournfully in the night, long agonised wail',
    'fire': 'crackling fire burning, wood popping',
    'rain': 'heavy rain falling, storm outside',
    'train': 'old steam train moving, wheels on tracks, steam hissing',
  }

  // Check if any keyword matches
  const lower = text.toLowerCase()
  for (const [keyword, enhanced] of Object.entries(enhancements)) {
    if (lower.includes(keyword)) {
      return enhanced
    }
  }

  // If no match, return original with extra context
  return `${text}, atmospheric sound effect, cinematic quality`
}

export async function POST(request) {
  try {
    const { ambienceText } = await request.json()

    if (!ambienceText || ambienceText === 'none') {
      return Response.json({ audio: null })
    }

    const enhancedPrompt = enhanceAmbiencePrompt(ambienceText)
    console.log('Ambience prompt:', enhancedPrompt)

    const response = await fetch(
      'https://api.elevenlabs.io/v1/sound-generation',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: enhancedPrompt,
          duration_seconds: 10,
          prompt_influence: 0.5
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return Response.json({ error }, { status: 500 })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    return Response.json({ audio: base64Audio })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
