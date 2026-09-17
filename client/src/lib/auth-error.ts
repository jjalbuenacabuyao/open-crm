import { AuthError } from '@supabase/supabase-js'

import { ApiError } from '#/lib/api.ts'

const FALLBACK = 'Something went wrong. Please try again.'

/**
 * Turns whatever a failed auth call threw into one line for the user.
 *
 * Supabase's own messages are surfaced verbatim. They are deliberately vague —
 * "Invalid login credentials" covers both a wrong password and an unknown
 * email, so an attacker cannot enumerate accounts — and rewording them here
 * would risk leaking the distinction back.
 */
export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthError || error instanceof ApiError) {
    return error.message || FALLBACK
  }

  if (error instanceof Error) {
    return error.message || FALLBACK
  }

  return FALLBACK
}
