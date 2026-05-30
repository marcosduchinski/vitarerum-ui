import { GroupName } from '@core/identity/models/group-name.enum';

export interface NavLink {
  readonly label: string;
  readonly path: string;
}

export interface NavSection {
  readonly label: string;
  readonly links: readonly NavLink[];
}

const PROPOSAL_EXTERNAL: readonly NavLink[] = [
  { label: 'New proposal', path: '/p/proposals/new' },
  { label: 'My proposals', path: '/p/proposals/my' },
];

const PROPOSAL_STAFF_QUEUE: readonly NavLink[] = [
  { label: 'Staff queue', path: '/p/proposals/queue' },
  { label: 'My assignments', path: '/p/proposals/assignments' },
];

const PROPOSAL_APPROVED: readonly NavLink[] = [
  { label: 'Approved', path: '/p/proposals/approved' },
  { label: 'Rejected / cancelled', path: '/p/proposals/rejected' },
];

const ADMIN_LINKS: readonly NavLink[] = [
  { label: 'Users', path: '/p/admin/users' },
  { label: 'Groups', path: '/p/admin/groups' },
];

export const NAV_SECTIONS: Readonly<Record<GroupName, readonly NavSection[]>> = {
  EXTERNAL: [
    { label: 'Proposals', links: PROPOSAL_EXTERNAL },
    { label: 'Projects', links: [{ label: 'My projects', path: '/p/projects/my' }] },
  ],
  COLLECTIONS_MANAGEMENT: [
    {
      label: 'Proposals',
      links: [
        ...PROPOSAL_STAFF_QUEUE,
        { label: 'Pending documents', path: '/p/proposals/pending-documents' },
        ...PROPOSAL_APPROVED,
      ],
    },
    {
      label: 'Projects',
      links: [
        { label: 'All projects', path: '/p/projects/all' },
        { label: 'In progress', path: '/p/projects/in-progress' },
        { label: 'Suspended', path: '/p/projects/suspended' },
        { label: 'Completed / closed', path: '/p/projects/completed' },
      ],
    },
    { label: 'Administration', links: ADMIN_LINKS },
  ],
  CURATORIAL: [
    {
      label: 'Proposals',
      links: [
        ...PROPOSAL_STAFF_QUEUE,
        { label: 'Pending direction', path: '/p/proposals/pending-direction' },
        ...PROPOSAL_APPROVED,
      ],
    },
    { label: 'Projects', links: [{ label: 'All projects', path: '/p/projects/all' }] },
    { label: 'Administration', links: ADMIN_LINKS },
  ],
  DIRECTION: [
    {
      label: 'Proposals',
      links: [
        { label: 'Pending direction', path: '/p/proposals/pending-direction' },
        { label: 'Approved', path: '/p/proposals/approved' },
      ],
    },
    { label: 'Projects', links: [{ label: 'All projects', path: '/p/projects/all' }] },
  ],
};
