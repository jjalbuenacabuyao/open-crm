import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { Session, User } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../supabase/supabase.client';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  firstName: string;
  lastName: string;
}

/** What a sign-up produced, so the caller knows whether a session exists yet. */
export interface SignUpResult {
  session: Session | null;
}

/**
 * The only place in the app that talks to Supabase Auth.
 *
 * The Go API never issues tokens — it validates the ones minted here — so this
 * service owns the whole session lifecycle and everything else reads it through
 * the exposed signals.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _session = signal<Session | null>(null);
  private readonly _initialized = signal(false);

  readonly session = this._session.asReadonly();

  /**
   * False until the persisted session has been read back from storage. Guards
   * must wait on this, or a hard refresh bounces a signed-in user to the login
   * page before the session has rehydrated.
   */
  readonly initialized = this._initialized.asReadonly();

  readonly user = computed<User | null>(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);

  /** Held so concurrent guards share one restore instead of racing getSession. */
  private readonly restored: Promise<void>;

  constructor() {
    this.restored = this.restoreSession();

    const { data } = this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
    });

    this.destroyRef.onDestroy(() => data.subscription.unsubscribe());
  }

  async signIn({ email, password }: SignInCredentials): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  }

  async signUp({ email, password, firstName, lastName }: SignUpCredentials): Promise<SignUpResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      // The names go into user_metadata so they survive into the signed JWT.
      // That is what lets the API provision a user from GET /auth/me alone,
      // even when the client never gets as far as calling /auth/register.
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (error) {
      throw error;
    }

    return { session: data.session };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this._session.set(null);
  }

  /**
   * The current access token, or null when signed out.
   *
   * Always read through this rather than caching the value: access tokens
   * expire after an hour and supabase-js swaps them out in the background, so a
   * token captured at bootstrap starts producing 401s that look like API bugs.
   */
  async accessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  /** Resolves once the persisted session has been loaded. */
  whenInitialized(): Promise<void> {
    return this.restored;
  }

  private async restoreSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this._session.set(data.session);
    this._initialized.set(true);
  }
}
