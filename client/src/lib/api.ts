import { accessToken } from '#/lib/auth.ts'
import { API_BASE_URL } from '#/lib/env.ts'

/** Every endpoint on our API lives under this prefix. */
export const API_PREFIX = '/api/v1'

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${API_PREFIX}${path}`
}

/** A non-2xx response from our API, carrying the message it chose to expose. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Calls our API with the Supabase access token attached.
 *
 * Browser only, by way of `accessToken()`. The token is resolved per request
 * rather than passed in, so a caller can never hand over a stale one.
 *
 * Credentials are deliberately not sent: the API allows no cookies and
 * authenticates from the Authorization header alone.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await accessToken()

  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (!response.ok) {
    // The API answers errors as {"error": "..."}; anything else (a proxy page,
    // a CORS rejection) has no body worth showing, so fall back to the status.
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new ApiError(
      response.status,
      body?.error ?? `Request failed with status ${response.status}`,
    )
  }

  // DELETE answers 204 with no body to parse.
  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/** Mirrors domain.User as the Go API serializes it. */
export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface RegisterProfileRequest {
  firstName: string
  lastName: string
}

/**
 * Creates the local user row for the signed-in Supabase identity.
 * Idempotent — the API returns the existing user on a repeat call.
 */
export function registerProfile(
  request: RegisterProfileRequest,
): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** The signed-in user's profile. Provisions the local row if it does not exist. */
export function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/me')
}
