import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBriefcase,
  lucideEllipsis,
  lucideFolder,
  lucideHandshake,
  lucidePlus,
  lucideShare,
  lucideTarget,
  lucideTrash2,
} from '@ng-icons/lucide';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';

import { WorkspaceItem } from './nav-data';

@Component({
  selector: 'app-nav-workspaces',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSidebarImports, HlmDropdownMenuImports, NgIcon, RouterLink],
  providers: [
    provideIcons({
      lucideBriefcase,
      lucideHandshake,
      lucideTarget,
      lucideEllipsis,
      lucideFolder,
      lucideShare,
      lucideTrash2,
      lucidePlus,
    }),
  ],
  templateUrl: './nav-workspaces.html',
})
export class NavWorkspaces {
  private readonly sidebar = inject(HlmSidebarService);

  readonly workspaces = input.required<WorkspaceItem[]>();

  // On mobile the sidebar is a sheet, so a right-anchored menu would open off
  // screen; drop it below the trigger instead.
  protected readonly menuSide = computed(() => (this.sidebar.isMobile() ? 'bottom' : 'right'));
  protected readonly menuAlign = computed(() => (this.sidebar.isMobile() ? 'end' : 'start'));
}
