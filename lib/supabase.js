import { createClient } from '@supabase/supabase-js'

let _supabase = null

export const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )
  }
  return _supabase
}

// Keep named export for backwards compat — initialized lazily on first access
export const supabase = new Proxy({}, {
  get(_, prop) {
    return getSupabase()[prop]
  }
})
