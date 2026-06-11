export const dynamic = 'force-dynamic'
import { getSupabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Invalid email' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase
      .from('waitlist')
      .upsert({ email, created_at: new Date().toISOString() }, { onConflict: 'email' })

    if (error) {
      console.error('Waitlist error:', error)
      return Response.json({ error: 'Failed to save' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
