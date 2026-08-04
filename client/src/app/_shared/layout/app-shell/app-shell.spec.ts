import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../_core/auth/auth.service';
import { ProfileService } from '../../../_core/auth/profile.service';
import { AppShell } from './app-shell';

class AuthServiceStub {
  signOut = vi.fn().mockResolvedValue(undefined);
  whenInitialized = () => Promise.resolve();
  isAuthenticated = () => true;
  user = () => ({ id: 'u-1', email: 'joel@example.com' });
}

class ProfileServiceStub {
  profile = { isLoading: () => false, error: () => undefined, value: () => undefined };
  displayName = () => 'Joel Cabuyao';
  email = () => 'joel@example.com';
  initials = () => 'JC';
}

describe('AppShell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: ProfileService, useClass: ProfileServiceStub },
      ],
    }).compileComponents();
  });

  it('renders the sidebar and the inset side by side', async () => {
    const fixture = TestBed.createComponent(AppShell);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const wrapper = compiled.querySelector('[hlmSidebarWrapper]');
    expect(wrapper).toBeTruthy();

    // The inset styling is a sibling selector, so these two must not nest.
    const sidebar = compiled.querySelector('hlm-sidebar');
    const inset = compiled.querySelector('main[hlmSidebarInset]');
    expect(sidebar).toBeTruthy();
    expect(inset).toBeTruthy();
    expect(sidebar?.contains(inset!)).toBe(false);

    // The trigger must be a <button>; any other host element renders unstyled.
    expect(compiled.querySelector('button[hlmSidebarTrigger]')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('renders every nav group and the signed-in user in the footer', async () => {
    const fixture = TestBed.createComponent(AppShell);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Platform');
    expect(text).toContain('Dashboard');
    expect(text).toContain('Contacts');
    expect(text).toContain('Workspaces');
    expect(text).toContain('Support');
    expect(text).toContain('Joel Cabuyao');
    expect(text).toContain('joel@example.com');
  });
});
