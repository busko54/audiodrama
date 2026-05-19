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

- speaker: ONLY use these exact names: "narrator", "jonathan harker", "old landlady", "counts driver", "count dracula". If unsure use "narrator".
- line: exact text to speak
- tone: one of [normal, whisper, shout, laugh, cry, tremble, commanding, pleading, mocking, breathless, solemn, frantic, cold, warm, sarcastic, ominous, exhausted, excited]
- emotion: one of [neutral, fearful, terrified, horrified, angry, furious, joyful, sad, grief, tense, anxious, mysterious, curious, disgusted, desperate, relieved, suspicious, confused, determined, resigned, awestruck, lonely]
- ambience: describe the background sound in detail. Be very specific and cinematic. Examples:
  "wolves howling far in the distance, barely audible"
  "wolves howling close and surrounding, loud and terrifying"
  "panicked breathing, running footsteps on dirt road, wolves snarling inches away"
  "clock tower bells striking midnight, twelve deep resonant chimes"
  "horse hooves galloping frantically on rocky road"
  "complete dead silence, not a sound"
  Never return "none". If no obvious sound, return a subtle atmospheric sound like "quiet room ambience" or "night insects".
- ambience_volume: one of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] — how loud the ambience should be. Distant sounds = 0.1-0.2. Normal = 0.3-0.4. Intense scenes = 0.6-0.9.

- IMPORTANT RULES:
  1. If wolves are mentioned getting closer across multiple blocks, increase ambience_volume each block
  2. If someone is running or panicking, ambience must include "panicked breathing and running footsteps"
  3. If a specific sound is mentioned at a specific moment, split the line at that moment into two blocks
  4. Match the intensity of ambience to the drama of the scene

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
