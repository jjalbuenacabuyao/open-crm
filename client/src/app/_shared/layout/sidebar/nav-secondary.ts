import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLifeBuoy, lucideSend } from '@ng-icons/lucide';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

import { NavItem } from './nav-data';

@Component({
  selector: 'app-nav-secondary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSidebarImports, NgIcon, RouterLink],
  providers: [provideIcons({ lucideLifeBuoy, lucideSend })],
  templateUrl: './nav-secondary.html',
})
export class NavSecondary {
  readonly items = input.required<NavItem[]>();
}
