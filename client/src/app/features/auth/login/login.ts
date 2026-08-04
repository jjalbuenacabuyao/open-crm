import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSpinner } from '@spartan-ng/helm/spinner';

import { AuthService } from '../../../_core/auth/auth.service';
import { UserApi } from '../../../_core/api/user.api';
import { AuthLayout } from '../auth-layout/auth-layout';
import { authErrorMessage } from '../auth-error';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AuthLayout,
    FormField,
    HlmAlertImports,
    HlmButton,
    HlmFieldImports,
    HlmInput,
    HlmSpinner,
    RouterLink,
  ],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserApi);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal('');

  protected readonly model = signal({ email: '', password: '' });

  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required.' });
    email(path.email, { message: 'Enter a valid email address.' });
    required(path.password, { message: 'Password is required.' });
    minLength(path.password, 8, { message: 'Passwords are at least 8 characters.' });
  });

  protected onSubmit(): void {
    submit(this.loginForm, async () => {
      this.serverError.set('');
      this.submitting.set(true);

      try {
        const { email: emailValue, password } = this.model();
        await this.auth.signIn({ email: emailValue.trim(), password });

        // Makes sure the local user row exists before the app starts reading it.
        // Non-fatal: /auth/me provisions on demand, so a failure here only
        // delays the mirror, it does not break the sign-in.
        await this.users.me().catch((error: unknown) => {
          console.error('Failed to load profile after sign in', error);
        });

        await this.router.navigateByUrl('/');
      } catch (error: unknown) {
        this.serverError.set(authErrorMessage(error));
      } finally {
        this.submitting.set(false);
      }
    });
  }
}
