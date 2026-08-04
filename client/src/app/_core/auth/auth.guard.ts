import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Blocks routes that need a signed-in user.
 *
 * This is a UX affordance, not a security boundary — the Go API validates every
 * token independently, so a user who bypasses this still gets 401s.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for the persisted session, otherwise a hard refresh redirects a
  // signed-in user to the login page before storage has been read.
  await auth.whenInitialized();

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: state.url === '/' ? undefined : { returnTo: state.url },
  });
};

/** Keeps a signed-in user off the login and signup pages. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenInitialized();

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
