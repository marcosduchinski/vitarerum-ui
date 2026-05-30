import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  getWorkflowStatusPresentation,
  StatusChipComponent,
  WorkflowStatus,
} from './status-chip.component';

@Component({
  standalone: true,
  imports: [StatusChipComponent],
  template: `<app-status-chip kind="proposal" [status]="status" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StatusChipHostComponent {
  status: WorkflowStatus = 'UNDER_REVIEW';
}

describe('StatusChipComponent', () => {
  it('maps workflow statuses to labels and tones', () => {
    expect(getWorkflowStatusPresentation('PENDING_DOCUMENTS')).toEqual({
      label: 'Pending documents',
      tone: 'pending',
    });
    expect(getWorkflowStatusPresentation('IN_PROGRESS')).toEqual({
      label: 'In progress',
      tone: 'review',
    });
    expect(getWorkflowStatusPresentation('AUTHORIZATION_REFUSED')).toEqual({
      label: 'Authorization refused',
      tone: 'rejected',
    });
  });

  it('renders an accessible status chip', async () => {
    await TestBed.configureTestingModule({
      imports: [StatusChipHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(StatusChipHostComponent);

    fixture.detectChanges();
    await fixture.whenStable();

    const chip = fixture.nativeElement.querySelector('.status-chip') as HTMLElement | null;

    expect(chip?.textContent?.trim()).toBe('Under review');
    expect(chip?.classList.contains('status-chip--review')).toBe(true);
    expect(chip?.getAttribute('aria-label')).toBe('Proposal status: Under review');
  });
});
