import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

import { AppSidebar } from '../sidebar/app-sidebar';
import { SiteHeader } from '../site-header/site-header';

/**
 * Chrome for every authenticated route: sidebar on the left, routed page on the
 * right. Sign-in and sign-up sit outside it and render as full-page cards.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSidebarImports, AppSidebar, SiteHeader, RouterOutlet],
  templateUrl: './app-shell.html',
})
export class AppShell {}
