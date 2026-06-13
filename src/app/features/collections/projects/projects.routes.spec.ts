import { PROJECTS_ROUTES } from './projects.routes';
import { projectLogAccessGuard } from './guards/project-log-access.guard';

describe('PROJECTS_ROUTES', () => {
  it('routes my projects to a page component', () => {
    const route = PROJECTS_ROUTES.find((candidate) => candidate.path === 'my');

    expect(route?.redirectTo).toBeUndefined();
    expect(route?.loadComponent).toBeDefined();
  });

  it('routes in progress projects to a page component', () => {
    const route = PROJECTS_ROUTES.find((candidate) => candidate.path === 'in-progress');

    expect(route?.redirectTo).toBeUndefined();
    expect(route?.loadComponent).toBeDefined();
  });

  it('routes completed projects to a page component', () => {
    const route = PROJECTS_ROUTES.find((candidate) => candidate.path === 'completed');

    expect(route?.redirectTo).toBeUndefined();
    expect(route?.loadComponent).toBeDefined();
  });

  it('keeps project log routes before the generic detail route', () => {
    const paths = PROJECTS_ROUTES.map((route) => route.path);
    const detailIndex = paths.indexOf(':id');

    expect(paths.indexOf(':id/log/research')).toBeLessThan(detailIndex);
    expect(paths.indexOf(':id/log/exhibition')).toBeLessThan(detailIndex);
    expect(paths.indexOf(':id/log/other')).toBeLessThan(detailIndex);
    expect(paths.indexOf(':id/occurrences/research')).toBeLessThan(detailIndex);
    expect(paths.indexOf(':id/occurrences/exhibition')).toBeLessThan(detailIndex);
    expect(paths.indexOf(':id/occurrences/other')).toBeLessThan(detailIndex);
  });

  it('guards and lazy-loads occurrence log routes separately from access log routes', () => {
    const occurrencePaths = [
      ':id/occurrences/research',
      ':id/occurrences/exhibition',
      ':id/occurrences/other',
    ];

    for (const path of occurrencePaths) {
      const route = PROJECTS_ROUTES.find((candidate) => candidate.path === path);

      expect(route?.loadComponent).toBeDefined();
      expect(route?.canActivate).toContain(projectLogAccessGuard);
    }
  });
});
