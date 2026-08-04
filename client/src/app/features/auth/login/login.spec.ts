import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../_core/auth/auth.service';
import { Login } from './login';

class AuthServiceStub {
  signIn = vi.fn().mockResolvedValue(undefined);
  whenInitialized = () => Promise.resolve();
  isAuthenticated = () => false;
}

describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useClass: AuthServiceStub },
      ],
    }).compileComponents();
  });

  it('renders the email and password fields', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('input#email')).toBeTruthy();
    expect(compiled.querySelector('input#password')).toBeTruthy();
    expect(compiled.querySelector('button[type="submit"]')?.textContent).toContain('Sign in');
  });

  it('shows a validation error once a required field is touched and left empty', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const emailInput = compiled.querySelector<HTMLInputElement>('input#email');
    emailInput?.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    const error = compiled.querySelector('hlm-field-error');
    expect(error?.textContent).toContain('Email is required.');
  });
});
