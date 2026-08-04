import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { AuthService } from './_core/auth/auth.service';

// AuthService is stubbed so the shell test never constructs a Supabase client:
// the real one reads the generated environment and opens a network connection.
class AuthServiceStub {
  whenInitialized = () => Promise.resolve();
  isAuthenticated = () => false;
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: AuthService, useClass: AuthServiceStub }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
