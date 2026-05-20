export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { chapterText } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // PASS 1 — Extract basic blocks
    const pass1 = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are an audio drama director. Read the following chapter and return a JSON array. For each line of dialogue or narration extract:
- speaker: ONLY use these exact names: "narrator", "jonathan harker", "old landlady", "counts driver", "count dracula". If unsure use "narrator".
- line: exact text to speak
- tone: one of [normal, whisper, shout, laugh, cry, tremble, commanding, pleading, mocking, breathless, solemn, frantic, cold, warm, sarcastic, ominous, exhausted, excited]
- emotion: one of [neutral, fearful, terrified, horrified, angry, furious, joyful, sad, grief, tense, anxious, mysterious, curious, disgusted, desperate, relieved, suspicious, confused, determined, resigned, awestruck, lonely]
- ambience: describe background sound in detail
- ambience_volume: number between 0.1 and 0.9

Return ONLY valid JSON. No explanation. No markdown. No backticks.
Chapter:
${chapterText}`
      }]
    })

    const pass1text = pass1.choices[0].message.content
    const pass1clean = pass1text.replace(/```json|```/g, '').trim()
    const pass1blocks = JSON.parse(pass1clean)

    // PASS 2 — Review and fix splits, volumes, ambience
    const pass2 = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are a senior audio drama director reviewing a junior director's work. Here are the extracted blocks:

${JSON.stringify(pass1blocks, null, 2)}

Fix the following issues and return a corrected JSON array:

1. SPLITS: If a line mentions a specific sound at a specific moment, split it into two blocks at that exact word. Example: "when the clock strikes midnight, all evil things will have full sway" → Block 1: "when the clock strikes midnight" with ambience "clock tower striking midnight, twelve deep chimes". Block 2: "all evil things will have full sway" with ambience "low horror drone".
2. VOLUME ESCALATION: If wolves or danger is getting closer across multiple blocks, increase ambience_volume each block. Distant = 0.15. Getting closer = 0.3. Surrounding = 0.6. Right next to you = 0.9.
3. PANIC SOUNDS: If someone is running, jumping, or in immediate danger, ambience must be "panicked breathing, running footsteps, wolves snarling close" with volume 0.8.
4. MISSING BLOCKS: Make sure every sentence from the original is represented. Do not skip narrator lines.
5. AMBIENCE ACCURACY: Make sure ambience matches exactly what is happening at that moment in the story.

Return ONLY the corrected valid JSON array. No explanation. No markdown. No backticks.`
      }]
    })

    const pass2text = pass2.choices[0].message.content
    const pass2clean = pass2text.replace(/```json|```/g, '').trim()
    const finalBlocks = JSON.parse(pass2clean)

    return Response.json({ blocks: finalBlocks })

  } catch (error) {
    console.error('Parse error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
