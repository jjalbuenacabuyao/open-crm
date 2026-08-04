import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeCheck,
  lucideBell,
  lucideChevronsUpDown,
  lucideCreditCard,
  lucideLogOut,
  lucideSparkles,
} from '@ng-icons/lucide';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';

import { AuthService } from '../../../_core/auth/auth.service';
import { ProfileService } from '../../../_core/auth/profile.service';

@Component({
  selector: 'app-nav-user',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSidebarImports, HlmAvatarImports, HlmDropdownMenuImports, NgIcon],
  providers: [
    provideIcons({
      lucideChevronsUpDown,
      lucideSparkles,
      lucideBadgeCheck,
      lucideCreditCard,
      lucideBell,
      lucideLogOut,
    }),
  ],
  templateUrl: './nav-user.html',
})
export class NavUser {
  private readonly sidebar = inject(HlmSidebarService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly profile = inject(ProfileService);
  protected readonly signingOut = signal(false);

  // A right-anchored menu would open off screen while the sidebar is a sheet.
  protected readonly menuSide = computed(() => (this.sidebar.isMobile() ? 'top' : 'right'));

  protected async signOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/auth/login');
    } finally {
      this.signingOut.set(false);
    }
  }
}
