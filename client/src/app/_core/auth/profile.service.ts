import { computed, inject, Injectable, resource } from '@angular/core';

import { UserApi } from '../api/user.api';
import { AuthService } from './auth.service';

/**
 * The signed-in user's profile from our own API, shared across the app.
 *
 * Both the sidebar footer and the dashboard need it, and injecting one root
 * resource keeps that to a single GET /auth/me instead of one per consumer.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly users = inject(UserApi);
  private readonly auth = inject(AuthService);

  readonly profile = resource({
    // Undefined while signed out, which keeps the loader from firing an
    // unauthenticated /auth/me, and reloads it when the identity changes.
    params: () => this.auth.user()?.id,
    loader: () => this.users.me(),
  });

  /** Display name, falling back to the email local part before the API responds. */
  readonly displayName = computed(() => {
    const user = this.profile.value();
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    if (name) return name;
    return this.email().split('@')[0] || 'Account';
  });

  readonly email = computed(() => this.profile.value()?.email ?? this.auth.user()?.email ?? '');

  /** Two-letter avatar fallback. */
  readonly initials = computed(() => {
    const user = this.profile.value();
    const first = user?.firstName?.trim()?.[0] ?? '';
    const last = user?.lastName?.trim()?.[0] ?? '';
    const initials = `${first}${last}`.toUpperCase();
    return initials || (this.email()[0]?.toUpperCase() ?? '?');
  });
}
