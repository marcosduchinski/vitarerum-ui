import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ProjectDetailPageComponent } from '../detail/project-detail-page.component';

@Component({
  selector: 'app-project-direction-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectDetailPageComponent],
  template: `
    <app-project-detail-page
      [id]="id()"
      [returnTo]="returnTo()"
      [returnLabel]="returnLabel()"
    />
  `,
})
export class ProjectDirectionDetailPageComponent {
  readonly id = input.required<string>();
  readonly returnTo = input<string>();
  readonly returnLabel = input<string>();
}
