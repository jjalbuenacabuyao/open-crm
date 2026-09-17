/**
 * Browser configuration, read once from Vite's compile-time env.
 *
 * Reading `import.meta.env` at module scope is safe in a way `process.env` is
 * not: Vite substitutes these statically at build time rather than looking them
 * up in a per-request runtime environment.
 *
 * Missing values are not thrown on here. This module is part of the SSR bundle,
 * and failing at import time would take down every page instead of the one
 * feature that needs the value — `getSupabase()` reports the problem instead.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''

export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/**
 * Where the Go API lives. There is no dev proxy in front of it, so this is an
 * absolute cross-origin URL and the origin must appear in CORS_ORIGINS in
 * server/.env.
 */
export const API_BASE_URL = (
  // `||`, not `??`: a blank `VITE_API_BASE_URL=` in .env arrives as '', which
  // `??` keeps — and an empty base turns every call into a relative request
  // that the Vite dev server answers instead of the API.
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8080'
).replace(/\/+$/, '')
