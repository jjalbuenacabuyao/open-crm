import { inject } from '@angular/core';
import { type HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';

import { isApiRequest } from '../api/api-url';
import { AuthService } from './auth.service';

/**
 * Attaches the Supabase access token to requests aimed at our own API.
 *
 * Requests to Supabase itself are left alone — supabase-js sets its own apikey
 * and Authorization headers, and overwriting them breaks anonymous calls.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }

  const auth = inject(AuthService);

  // Resolved per request rather than cached: supabase-js rotates the access
  // token roughly hourly, and a stale one would 401 against a healthy API.
  return from(auth.accessToken()).pipe(
    switchMap((token) =>
      next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request),
    ),
  );
};
