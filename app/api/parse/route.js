export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { chapterText, bookId, chapterNumber } = await request.json()

    // Check for pre-processed JSON file first
    if (bookId && chapterNumber) {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const filePath = path.join(process.cwd(), 'public', 'books', bookId, `chapter-${chapterNumber}.json`)
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')
          const blocks = JSON.parse(fileContent)
          console.log('Serving pre-processed JSON:', bookId, chapterNumber)
          return Response.json({ blocks })
        }
      } catch (fileError) {
        console.log('No pre-processed file found, falling back to GPT')
      }
    }

    // Fall back to GPT for chapters without pre-processed files
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
        content: `You are an audio drama director. Read the following chapter and return a JSON array. For each line of dialogue or narration extract:
- speaker: ONLY use these exact names: "narrator", "jonathan harker", "old landlady", "counts driver", "count dracula". If unsure use "narrator".
- line: exact text to speak
- tone: one of [normal, whisper, shout, laugh, cry, tremble, commanding, pleading, ominous, frantic, solemn, breathless, exhausted, excited]
- emotion: one of [neutral, fearful, terrified, horrified, angry, tense, anxious, mysterious, desperate, awestruck]
- ambience: describe background sound in detail. Always include sounds explicitly mentioned in the text.
- ambience_volume: number between 0.1 and 0.9

Return ONLY valid JSON. No explanation. No markdown. No backticks.
Chapter:
${chapterText}`
      }]
    })

    const pass1text = pass1.choices[0].message.content
    const pass1clean = pass1text.replace(/```json|```/g, '').trim()
    const blocks = JSON.parse(pass1clean)

    return Response.json({ blocks })

  } catch (error) {
    console.error('Parse error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
