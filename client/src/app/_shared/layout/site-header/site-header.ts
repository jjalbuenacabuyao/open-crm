import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSidebarImports, HlmSeparatorImports, HlmBreadcrumbImports],
  templateUrl: './site-header.html',
})
export class SiteHeader {
  /** Current page label, shown as the last breadcrumb crumb. */
  readonly page = input('Dashboard');
}
