import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ProposalEvent } from '../../../../models/proposal.model';
import { ProposalMyEventsSectionComponent } from './proposal-my-events-section.component';

const EVENTS: readonly ProposalEvent[] = [
  {
    occurredAt: '2026-05-01T10:00:00',
    type: 'SUBMITTED',
    triggeredBy: {
      permissionId: 'permission-external',
      user: { id: 'user-1', name: 'Alice Ferreira', email: 'alice@example.test' },
      group: 'EXTERNAL',
    },
    note: 'Submitted for review.',
  },
];

describe('ProposalMyEventsSectionComponent', () => {
  it('renders proposal events', async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalMyEventsSectionComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProposalMyEventsSectionComponent);
    const componentRef: ComponentRef<ProposalMyEventsSectionComponent> = fixture.componentRef;

    componentRef.setInput('events', EVENTS);
    componentRef.setInput('loading', false);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Event log');
    expect(compiled.textContent).toContain('SUBMITTED');
    expect(compiled.textContent).toContain('Alice Ferreira');
    expect(compiled.textContent).toContain('Submitted for review.');
    expect(compiled.textContent).toContain('01 May 2026');
  });

  it('renders the empty state when there are no events', async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalMyEventsSectionComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProposalMyEventsSectionComponent);
    const componentRef: ComponentRef<ProposalMyEventsSectionComponent> = fixture.componentRef;

    componentRef.setInput('events', []);
    componentRef.setInput('loading', false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No events recorded.');
  });
});
