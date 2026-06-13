export const dynamic = 'force-dynamic'

import { getCachedBlock } from '@/lib/cache'
import { MOMENT_SOUNDS, BACKGROUND_SOUNDS } from '@/app/api/soundplan/route'

// GET /api/inspect?book=dracula&chapter=1&block=27
// Reads the cached block (no credits) and reports what audio it actually contains.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const bookId = searchParams.get('book') || 'dracula'
  const chapterNumber = Number(searchParams.get('chapter') || '1')
  const blockIndex = Number(searchParams.get('block') || '0')

  const cached = await getCachedBlock(bookId, chapterNumber, blockIndex)

  if (!cached) {
    return Response.json({
      cached: false,
      message: `Block ${blockIndex} is NOT in the cache. It will regenerate on next play.`
    })
  }

  const len = (s) => (typeof s === 'string' ? s.length : 0)

  return Response.json({
    cached: true,
    blockIndex,
    speaker: cached.speaker,
    line: cached.line,
    audio:          { present: !!cached.audio,          bytes: len(cached.audio) },
    ambienceAudio:  { present: !!cached.ambienceAudio,  bytes: len(cached.ambienceAudio) },
    ambience2Audio: { present: !!cached.ambience2Audio, bytes: len(cached.ambience2Audio) },
    momentAudio:    { present: !!cached.momentAudio,    bytes: len(cached.momentAudio) },
    moment2Audio:   { present: !!cached.moment2Audio,   bytes: len(cached.moment2Audio) },
    moment1_delay: cached.moment1_delay,
    moment2_delay: cached.moment2_delay,
    musicTrack: cached.musicTrack,
  })
}
