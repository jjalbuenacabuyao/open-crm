import { useQuery } from '@tanstack/react-query'

import { getMe } from '#/lib/api.ts'
import { useAuth } from '#/lib/auth.ts'

export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: getMe,
    enabled: Boolean(userId),
  })

  const profile = query.data

  const email = profile?.email ?? user?.email ?? ''
  const fullName =
    `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()
  const displayName = fullName || email.split('@')[0] || 'Account'

  const first = profile?.firstName.trim().charAt(0) ?? ''
  const last = profile?.lastName.trim().charAt(0) ?? ''
  const initials =
    `${first}${last}`.toUpperCase() || email.charAt(0).toUpperCase() || '?'

  return {
    displayName,
    email,
    initials,
    isLoading: query.isLoading,
    error: query.error,
  }
}
