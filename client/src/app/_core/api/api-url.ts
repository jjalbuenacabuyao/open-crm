import { environment } from '../../../environments/environment';

/** Every endpoint on our API lives under this prefix. */
export const API_PREFIX = '/api/v1';

/**
 * Builds a URL for our API.
 *
 * In development `apiBaseUrl` is empty and this returns a relative path, which
 * the `ng serve` proxy forwards to the Go server — so the browser only ever
 * talks to one origin. Set API_BASE_URL in .env to point at an absolute host.
 */
export function apiUrl(path: string): string {
  return `${environment.apiBaseUrl}${API_PREFIX}${path}`;
}

/**
 * Whether a request is aimed at our API and should carry the Supabase token.
 *
 * Note the empty-base case is checked explicitly: `startsWith('')` is true for
 * every string, so a naive prefix test would attach our token to Supabase's own
 * requests, which already carry their own credentials.
 */
export function isApiRequest(url: string): boolean {
  if (environment.apiBaseUrl) {
    return url.startsWith(environment.apiBaseUrl);
  }
  return url.startsWith(API_PREFIX);
}
