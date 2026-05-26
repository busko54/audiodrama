export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { chapterText, bookId, chapterNumber } = await request.json()

    // Check for pre-processed JSON file first
    if (bookId && chapterNumber) {
      try {
        const fileUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://audiodrama.vercel.app'}/books/${bookId}/chapter-${chapterNumber}.json`
        const fileRes = await fetch(fileUrl)

        if (fileRes.ok) {
          const data = await fileRes.json()
          console.log('Serving pre-processed JSON:', bookId, chapterNumber)

          // Support both old format (array) and new format (object with setting + blocks)
          if (Array.isArray(data)) {
            return Response.json({ blocks: data, setting: '' })
          } else {
            return Response.json({ blocks: data.blocks, setting: data.setting || '' })
          }
        }
      } catch (fileError) {
        console.log('No pre-processed file found, falling back to GPT:', fileError.message)
      }
    }

    // Fall back to GPT
    if (!chapterText) {
      return Response.json({ error: 'No chapter text provided and no pre-processed file found' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const pass1 = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are an audio drama director. Read the following chapter and return a JSON object with two fields:
- setting: a short description of the scene environment (e.g. "English countryside drawing room, daytime, refined and quiet")
- blocks: a JSON array where each item has:
  - speaker: ONLY use these exact names: "narrator", "jonathan harker", "old landlady", "counts driver", "count dracula". If unsure use "narrator".
  - line: exact text to speak
  - tone: one of [normal, whisper, shout, laugh, cry, tremble, commanding, pleading, ominous, frantic, solemn, breathless, exhausted, excited]
  - emotion: one of [neutral, fearful, terrified, horrified, angry, tense, anxious, mysterious, desperate, awestruck]
Return ONLY valid JSON. No explanation. No markdown. No backticks.
Chapter:
${chapterText}`
      }]
    })

    const pass1text = pass1.choices[0].message.content
    const pass1clean = pass1text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(pass1clean)

    return Response.json({ blocks: parsed.blocks, setting: parsed.setting || '' })

  } catch (error) {
    console.error('Parse error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
