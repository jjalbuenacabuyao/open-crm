import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCommand } from '@ng-icons/lucide';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

import { NAV_MAIN, NAV_SECONDARY, WORKSPACES } from './nav-data';
import { NavMain } from './nav-main';
import { NavSecondary } from './nav-secondary';
import { NavUser } from './nav-user';
import { NavWorkspaces } from './nav-workspaces';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSidebarImports, NgIcon, RouterLink, NavMain, NavSecondary, NavUser, NavWorkspaces],
  providers: [provideIcons({ lucideCommand })],
  templateUrl: './app-sidebar.html',
})
export class AppSidebar {
  protected readonly navMain = NAV_MAIN;
  protected readonly navSecondary = NAV_SECONDARY;
  protected readonly workspaces = WORKSPACES;
}
