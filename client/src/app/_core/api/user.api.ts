import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api-url';

/** Mirrors domain.User as the Go API serializes it. */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterProfileRequest {
  firstName: string;
  lastName: string;
}

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly http = inject(HttpClient);

  /**
   * Creates the local user row for the signed-in Supabase identity.
   * Idempotent — the API returns the existing user on a repeat call.
   */
  register(request: RegisterProfileRequest): Promise<UserProfile> {
    return firstValueFrom(this.http.post<UserProfile>(apiUrl('/auth/register'), request));
  }

  /** The signed-in user's profile. Provisions the row if it does not exist. */
  me(): Promise<UserProfile> {
    return firstValueFrom(this.http.get<UserProfile>(apiUrl('/auth/me')));
  }
}
