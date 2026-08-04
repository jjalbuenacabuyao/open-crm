import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideChevronRight,
  lucideHandshake,
  lucideLayoutDashboard,
  lucideListTodo,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

import { NavItem } from './nav-data';

@Component({
  selector: 'app-nav-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSidebarImports, HlmCollapsibleImports, NgIcon, RouterLink, RouterLinkActive],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideUsers,
      lucideBuilding2,
      lucideHandshake,
      lucideListTodo,
      lucideChevronRight,
    }),
  ],
  templateUrl: './nav-main.html',
})
export class NavMain {
  readonly items = input.required<NavItem[]>();
}
