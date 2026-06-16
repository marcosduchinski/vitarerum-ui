import { staffGuard } from '@core/guards/staff.guard';

import { ProposalAgentPageComponent } from '../../ai-staff-assistance/pages/proposal-agent/proposal-agent-page.component';
import { PROPOSALS_ROUTES } from './proposals.routes';

describe('PROPOSALS_ROUTES', () => {
  it('keeps the ProposalAgent route before the generic my-assignment detail route', () => {
    const paths = PROPOSALS_ROUTES.map((route) => route.path);

    expect(paths.indexOf('my-assignments/:id/assistant/:messageId')).toBeLessThan(
      paths.indexOf('my-assignments/:id'),
    );
  });

  it('guards and lazy-loads the ProposalAgent page for staff users', async () => {
    const route = PROPOSALS_ROUTES.find(
      (candidate) => candidate.path === 'my-assignments/:id/assistant/:messageId',
    );
    const component = await route?.loadComponent?.();

    expect(route?.title).toBe('ProposalAgent');
    expect(route?.canMatch).toContain(staffGuard);
    expect(component).toBe(ProposalAgentPageComponent);
  });
});
