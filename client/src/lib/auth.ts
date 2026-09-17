import { Store, useSelector } from '@tanstack/react-store'

import { getSupabase, isSupabaseConfigured } from '#/lib/supabase.ts'

import type { Session, User } from '@supabase/supabase-js'

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials extends SignInCredentials {
  firstName: string
  lastName: string
}

export interface SignUpResult {
  /** Null when the project requires email confirmation: there is no token yet. */
  session: Session | null
  emailTaken: boolean
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthState {
  status: AuthStatus
  session: Session | null
  user: User | null
}

export const authStore = new Store<AuthState>({
  status: 'loading',
  session: null,
  user: null,
})

let subscribed = false

function setSession(session: Session | null): void {
  authStore.setState(() => ({
    status: session ? 'authenticated' : 'anonymous',
    session,
    user: session?.user ?? null,
  }))
}

export function initAuth(): void {
  if (subscribed || typeof window === 'undefined') {
    return
  }
  subscribed = true

  if (!isSupabaseConfigured()) {
    console.error(
      'Supabase is not configured. Copy client/.env.example to client/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
    setSession(null)
    return
  }

  const supabase = getSupabase()

  supabase.auth.onAuthStateChange((_event, session) => setSession(session))

  void supabase.auth.getSession().then(({ data }) => {
    if (authStore.state.status === 'loading') {
      setSession(data.session)
    }
  })
}

export function useAuth(): AuthState {
  return useSelector(authStore)
}

export async function signIn({
  email,
  password,
}: SignInCredentials): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    throw error
  }
}

export async function signUp({
  email,
  password,
  firstName,
  lastName,
}: SignUpCredentials): Promise<SignUpResult> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    // The names go into user_metadata so they survive into the signed JWT. That
    // is what lets the API provision a user from GET /auth/me alone, even when
    // the client never gets as far as calling POST /auth/register.
    options: { data: { first_name: firstName, last_name: lastName } },
  })

  if (error) {
    throw error
  }

  // Supabase hides existing accounts rather than erroring when confirmations
  // are on: the user comes back looking normal but with no identities attached.
  // With confirmations off the same case arrives as an error instead, which
  // falls through to the caller.
  const emailTaken =
    data.user !== null && (data.user.identities?.length ?? 0) === 0

  return { session: data.session, emailTaken }
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut()
}

export async function accessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession()
  return data.session?.access_token ?? null
}
