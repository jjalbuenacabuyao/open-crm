import { createClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '#/lib/env.ts'

import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/** Whether the browser was built with the Supabase keys it needs. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

/**
 * The single Supabase client for the application.
 *
 * Built lazily and cached rather than created per call: supabase-js keeps the
 * session and the refresh timer on the instance, so a second client would race
 * the first over the same localStorage entry and silently invalidate tokens.
 *
 * Browser only. This module is in the SSR bundle too, but a client constructed
 * during server rendering has no storage to restore a session from, and every
 * caller here runs from an event handler or an effect.
 */
export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error(
      'getSupabase() is browser-only — call it from an event handler or an effect, not during render.',
    )
  }

  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Supabase is not configured. Copy client/.env.example to client/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      )
    }

    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return client
}
