export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { ambienceText } = await request.json()

    if (!ambienceText || ambienceText === 'none') {
      return Response.json({ audio: null })
    }

    const response = await fetch(
      'https://api.elevenlabs.io/v1/sound-generation',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: ambienceText,
          duration_seconds: 10,
          prompt_influence: 0.3
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
