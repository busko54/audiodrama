import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request) {
  const { chapterText } = await request.json()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are an audio drama director. Read the following chapter and return a JSON array. For each line of dialogue or narration extract:
- speaker: character name or "narrator"
- line: exact text to speak
- tone: one of [normal, whisper, shout, laugh, tremble, commanding]
- emotion: one of [neutral, fearful, angry, joyful, sad, tense, mysterious]
- ambience: array of background sounds (e.g. wind, wolves, crowd, silence)

Return ONLY valid JSON. No explanation. No markdown. No backticks.

Chapter:
${chapterText}`
    }]
  })

  const json = JSON.parse(response.content[0].text)
  return Response.json({ blocks: json })
}
