import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';

/** The shared shell for the login and signup pages. */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCardImports],
  templateUrl: './auth-layout.html',
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly subheading = input.required<string>();
}
