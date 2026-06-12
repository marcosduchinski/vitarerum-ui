import { roleLandingUrl } from './role-landing.util';

describe('roleLandingUrl', () => {
  it('stays on the dashboard for any role', () => {
    expect(roleLandingUrl('EXTERNAL', '/p/dashboard')).toBeNull();
    expect(roleLandingUrl('CURATORIAL', '/p/dashboard')).toBeNull();
  });

  it('moves an external user off staff proposal pages', () => {
    expect(roleLandingUrl('EXTERNAL', '/p/collections/proposals/new')).toBe(
      '/p/collections/proposals/my',
    );
    expect(roleLandingUrl('EXTERNAL', '/p/collections/proposals/my-assignments/42')).toBe(
      '/p/collections/proposals/my',
    );
    expect(roleLandingUrl('EXTERNAL', '/p/collections/proposals/approved')).toBe(
      '/p/collections/proposals/my',
    );
  });

  it('moves a staff user off external proposal pages', () => {
    expect(roleLandingUrl('COLLECTIONS_MANAGEMENT', '/p/collections/proposals/my')).toBe(
      '/p/collections/proposals/new',
    );
    expect(roleLandingUrl('DIRECTION', '/p/collections/proposals/submit')).toBe(
      '/p/collections/proposals/new',
    );
  });

  it('keeps a staff user on staff pages when switching between staff groups', () => {
    expect(roleLandingUrl('CURATORIAL', '/p/collections/proposals/approved')).toBeNull();
    expect(roleLandingUrl('DIRECTION', '/p/collections/projects/pending')).toBeNull();
  });

  it('moves an external user off staff project pages', () => {
    expect(roleLandingUrl('EXTERNAL', '/p/collections/projects/pending')).toBe(
      '/p/collections/projects/my',
    );
    expect(roleLandingUrl('EXTERNAL', '/p/collections/projects/in-progress')).toBe(
      '/p/collections/projects/my',
    );
  });

  it('keeps everyone on shared pages (my projects, shared details)', () => {
    expect(roleLandingUrl('EXTERNAL', '/p/collections/projects/my')).toBeNull();
    expect(roleLandingUrl('CURATORIAL', '/p/collections/projects/my')).toBeNull();
    expect(roleLandingUrl('EXTERNAL', '/p/collections/proposals/123')).toBeNull();
    expect(roleLandingUrl('CURATORIAL', '/p/collections/projects/55/log/research')).toBeNull();
  });

  it('ignores query params when classifying the page', () => {
    expect(roleLandingUrl('EXTERNAL', '/p/collections/proposals/new?returnTo=%2Ffoo')).toBe(
      '/p/collections/proposals/my',
    );
    expect(roleLandingUrl('CURATORIAL', '/p/collections/proposals/123?returnTo=x')).toBeNull();
  });

  it('moves non-admins off admin pages, keeps sys admins there', () => {
    expect(roleLandingUrl('CURATORIAL', '/p/admin/users')).toBe('/p/dashboard');
    expect(roleLandingUrl('EXTERNAL', '/p/admin/groups/7')).toBe('/p/dashboard');
    expect(roleLandingUrl('SYS_ADMIN', '/p/admin/users')).toBeNull();
  });
});
