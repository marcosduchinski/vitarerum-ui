import { GroupName } from './models/group-name.enum';

const PROPOSALS_PREFIX = '/p/collections/proposals';
const PROJECTS_PREFIX = '/p/collections/projects';
const ADMIN_PREFIX = '/p/admin';

// First URL segment after the section prefix, by audience. Mirrors the menu:
// a page that is not in the new role's navigation gets replaced by that role's
// section landing page. Unlisted segments are shared detail routes (`:id`,
// `:id/log/...`), which stay put — their data reloads via the permission-keyed
// resources.
const STAFF_PROPOSAL_PAGES = ['new', 'my-assignments', 'others', 'approved', 'rejected'];
const EXTERNAL_PROPOSAL_PAGES = ['submit', 'my'];
const STAFF_PROJECT_PAGES = ['pending', 'in-progress', 'completed', 'cancelled'];

const STAFF_PROPOSALS_LANDING = `${PROPOSALS_PREFIX}/new`;
const EXTERNAL_PROPOSALS_LANDING = `${PROPOSALS_PREFIX}/my`;
const PROJECTS_LANDING = `${PROJECTS_PREFIX}/my`;
const DASHBOARD = '/p/dashboard';

function firstSegmentAfter(prefix: string, path: string): string {
  return path.slice(prefix.length).split('/').filter(Boolean)[0] ?? '';
}

/**
 * Where to navigate after the active group changes, or `null` to stay on the
 * current page. Keeps the user inside the section they were working in
 * whenever the new role has an equivalent page there.
 */
export function roleLandingUrl(group: GroupName, currentUrl: string): string | null {
  const path = currentUrl.split(/[?#]/)[0] ?? '';
  const staff = group !== 'EXTERNAL';

  if (path.startsWith(ADMIN_PREFIX)) {
    return group === 'SYS_ADMIN' ? null : DASHBOARD;
  }

  if (path.startsWith(PROPOSALS_PREFIX)) {
    const segment = firstSegmentAfter(PROPOSALS_PREFIX, path);
    if (STAFF_PROPOSAL_PAGES.includes(segment) && !staff) {
      return EXTERNAL_PROPOSALS_LANDING;
    }
    if (EXTERNAL_PROPOSAL_PAGES.includes(segment) && staff) {
      return STAFF_PROPOSALS_LANDING;
    }
    return null;
  }

  if (path.startsWith(PROJECTS_PREFIX)) {
    const segment = firstSegmentAfter(PROJECTS_PREFIX, path);
    if (STAFF_PROJECT_PAGES.includes(segment) && !staff) {
      return PROJECTS_LANDING;
    }
    return null;
  }

  return null;
}
