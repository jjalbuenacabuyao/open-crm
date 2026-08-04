import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSpinner } from '@spartan-ng/helm/spinner';

import { ProfileService } from '../../_core/auth/profile.service';

/**
 * Placeholder landing page inside the app shell. It exists so the auth flow has
 * somewhere to land and so the round trip through the Go API is visible.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCardImports, HlmSpinner],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly profile = inject(ProfileService);
}
