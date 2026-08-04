import { InjectionToken } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

/**
 * The single Supabase client for the application.
 *
 * Injected rather than created ad hoc: supabase-js keeps the session and the
 * refresh timer on the instance, so a second client would race the first over
 * the same localStorage entry and silently invalidate tokens.
 */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () =>
    createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
});
