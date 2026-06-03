import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PermissionPrincipal } from '@core/auth/models/permission.model';

import {
  ProposalMyWatchersSectionComponent,
  StaffWatcherOption,
} from './proposal-my-watchers-section.component';

const WATCHERS: readonly PermissionPrincipal[] = [
  {
    permissionId: 'permission-curatorial',
    user: { id: 'staff-2', name: 'Carolina Silva', email: 'carol@example.test' },
    group: 'CURATORIAL',
  },
];

const OPTIONS: readonly StaffWatcherOption[] = [
  {
    label: 'Dan Oliveira - Direction',
    permissionId: 'permission-direction',
  },
];

describe('ProposalMyWatchersSectionComponent', () => {
  it('renders watchers and emits add/remove intents', async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalMyWatchersSectionComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProposalMyWatchersSectionComponent);
    const componentRef: ComponentRef<ProposalMyWatchersSectionComponent> = fixture.componentRef;
    const added: string[] = [];
    const removed: string[] = [];

    componentRef.setInput('watchers', WATCHERS);
    componentRef.setInput('watcherOptions', OPTIONS);
    componentRef.setInput('staffLoading', false);
    componentRef.setInput('addingWatcher', false);
    componentRef.setInput('removingWatcherId', null);
    componentRef.setInput('resetVersion', 0);
    fixture.componentInstance.watcherAdded.subscribe((permissionId) => added.push(permissionId));
    fixture.componentInstance.watcherRemoved.subscribe((permissionId) =>
      removed.push(permissionId),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector<HTMLSelectElement>('#watcher-permission');
    const addButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Add',
    );
    const removeButton = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="Remove watcher Carolina Silva"]',
    );

    expect(compiled.textContent).toContain('Carolina Silva');
    expect(compiled.textContent).toContain('carol@example.test - Curatorial');
    expect(select?.textContent).toContain('Dan Oliveira - Direction');

    select!.value = 'permission-direction';
    select!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    addButton!.click();
    removeButton!.click();

    expect(added).toEqual(['permission-direction']);
    expect(removed).toEqual(['permission-curatorial']);

    componentRef.setInput('resetVersion', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(select!.value).toBe('');
  });
});
