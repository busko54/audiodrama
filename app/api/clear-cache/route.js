export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { bookId, chapterNumber } = await request.json()

    const query = supabase.from('cached_blocks').delete()

    if (bookId && chapterNumber) {
      query.eq('book_id', bookId).eq('chapter_number', chapterNumber)
    } else if (bookId) {
      query.eq('book_id', bookId)
    } else {
      query.neq('book_id', '')
    }

    const { error, count } = await query

    if (error) return Response.json({ error: error.message }, { status: 500 })

    console.log(`Cache cleared: bookId=${bookId} chapterNumber=${chapterNumber}`)
    return Response.json({ ok: true, deleted: count })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
