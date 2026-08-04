import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  maxLength,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
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
  selector: 'app-signup',
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
  templateUrl: './signup.html',
})
export class Signup {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserApi);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly serverError = signal('');

  /**
   * Set when Supabase accepts the signup but returns no session, which means
   * "Confirm email" is enabled on the project. Without this the user would be
   * left staring at a form that appeared to do nothing.
   */
  protected readonly confirmationEmail = signal('');

  protected readonly model = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  protected readonly signupForm = form(this.model, (path) => {
    required(path.firstName, { message: 'First name is required.' });
    maxLength(path.firstName, 100, { message: 'First name is too long.' });
    required(path.lastName, { message: 'Last name is required.' });
    maxLength(path.lastName, 100, { message: 'Last name is too long.' });

    required(path.email, { message: 'Email is required.' });
    email(path.email, { message: 'Enter a valid email address.' });

    required(path.password, { message: 'Password is required.' });
    minLength(path.password, 8, { message: 'Use at least 8 characters.' });

    required(path.confirmPassword, { message: 'Confirm your password.' });
    validate(path.confirmPassword, ({ value, valueOf }) =>
      value() !== valueOf(path.password)
        ? { kind: 'mismatch', message: 'Passwords do not match.' }
        : undefined,
    );
  });

  protected onSubmit(): void {
    submit(this.signupForm, async () => {
      this.serverError.set('');
      this.confirmationEmail.set('');
      this.submitting.set(true);

      try {
        const { firstName, lastName, email: emailValue, password } = this.model();
        const trimmedEmail = emailValue.trim();

        const { session } = await this.auth.signUp({
          email: trimmedEmail,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });

        if (!session) {
          // Email confirmation is on: there is no access token yet, so the API
          // cannot be called. The names are already in user_metadata, and
          // /auth/me will provision the row after the user confirms.
          this.confirmationEmail.set(trimmedEmail);
          return;
        }

        // Non-fatal: /auth/me provisions the same row on demand.
        await this.users
          .register({ firstName: firstName.trim(), lastName: lastName.trim() })
          .catch((error: unknown) => {
            console.error('Failed to create profile after sign up', error);
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
