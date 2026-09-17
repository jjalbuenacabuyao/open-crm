/// <reference types="vite/client" />

/**
 * Compile-time browser configuration. Vite inlines these into the bundle, so
 * every value here is readable by anyone who loads the page — only public keys
 * belong in a VITE_ variable.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
