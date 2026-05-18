export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { chapterText } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const { default: OpenAI } = await import('openai')
    
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are an audio drama director. Read the following chapter and return a JSON array. For each line of dialogue or narration extract:
- speaker: ONLY use these exact names: "narrator", "jonathan harker", "old landlady", "counts driver", "count dracula". If unsure which character is speaking, use "narrator".
- line: exact text to speak
- tone: one of [normal, whisper, shout, laugh, cry, tremble, commanding, pleading, mocking, breathless, solemn, frantic, cold, warm, sarcastic, ominous, exhausted, excited]
- emotion: one of [neutral, fearful, terrified, horrified, angry, furious, joyful, sad, grief, tense, anxious, mysterious, curious, disgusted, desperate, relieved, suspicious, confused, determined, resigned, awestruck, lonely]
- ambience: detect any background sounds that fit the scene naturally. Pay special attention to any sounds explicitly mentioned in the text like clocks, bells, animals, weather, crowds and always include them.

Return ONLY valid JSON. No explanation. No markdown. No backticks.
Chapter:
${chapterText}`
      }]
    })

    const text = response.choices[0].message.content
    console.log('GPT raw response:', text)
    
    const json = JSON.parse(text)
    return Response.json({ blocks: json })

  } catch (error) {
    console.error('Parse error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
