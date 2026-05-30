import { Group } from '@core/auth/models/group.model';
import { GroupMembership, PermissionPrincipal } from '@core/auth/models/permission.model';
import { UserDetail } from '@core/auth/models/user.model';
import { Page, PageQuery } from '@shared/models/page.model';

import { ProjectEntry, UseEvent } from '@features/projects/models/project.model';
import { Message, ProposalDetail, ProposalEvent } from '../models/proposal.model';

export const MOCK_GROUPS: Group[] = [
  { id: 'g-external', name: 'EXTERNAL' },
  { id: 'g-collections', name: 'COLLECTIONS_MANAGEMENT' },
  { id: 'g-curatorial', name: 'CURATORIAL' },
  { id: 'g-direction', name: 'DIRECTION' },
  { id: 'g-admin', name: 'ADMIN' },
];

export const MOCK_USERS: UserDetail[] = [
  {
    id: 'u-alice',
    name: 'Alice Ferreira',
    email: 'alice@ext.example.com',
    permissions: [{ permissionId: 'perm-alice', group: MOCK_GROUPS[0] }],
  },
  {
    id: 'u-bob',
    name: 'Bob Santos',
    email: 'bob@collections.example.com',
    permissions: [{ permissionId: 'perm-bob', group: MOCK_GROUPS[1] }],
  },
  {
    id: 'u-carol',
    name: 'Carol Souza',
    email: 'carol@curatorial.example.com',
    permissions: [{ permissionId: 'perm-carol', group: MOCK_GROUPS[2] }],
  },
  {
    id: 'u-dan',
    name: 'Dan Oliveira',
    email: 'dan@direction.example.com',
    permissions: [{ permissionId: 'perm-dan', group: MOCK_GROUPS[3] }],
  },
  {
    id: 'u-eve',
    name: 'Eve Lima',
    email: 'eve@admin.example.com',
    permissions: [{ permissionId: 'perm-eve', group: MOCK_GROUPS[4] }],
  },
  {
    id: 'u-fran',
    name: 'Fran Costa',
    email: 'fran@staff.example.com',
    permissions: [
      { permissionId: 'perm-fran-collections', group: MOCK_GROUPS[1] },
      { permissionId: 'perm-fran-curatorial',  group: MOCK_GROUPS[2] },
      { permissionId: 'perm-fran-direction',   group: MOCK_GROUPS[3] },
    ],
  },
];

export const MOCK_MEMBERSHIPS: GroupMembership[] = [
  { permissionId: 'perm-alice', user: MOCK_USERS[0], group: MOCK_GROUPS[0] },
  { permissionId: 'perm-bob', user: MOCK_USERS[1], group: MOCK_GROUPS[1] },
  { permissionId: 'perm-carol', user: MOCK_USERS[2], group: MOCK_GROUPS[2] },
  { permissionId: 'perm-dan', user: MOCK_USERS[3], group: MOCK_GROUPS[3] },
  { permissionId: 'perm-eve',              user: MOCK_USERS[4], group: MOCK_GROUPS[4] },
  { permissionId: 'perm-fran-collections', user: MOCK_USERS[5], group: MOCK_GROUPS[1] },
  { permissionId: 'perm-fran-curatorial',  user: MOCK_USERS[5], group: MOCK_GROUPS[2] },
  { permissionId: 'perm-fran-direction',   user: MOCK_USERS[5], group: MOCK_GROUPS[3] },
];

export const P: Record<string, PermissionPrincipal> = {
  alice: {
    permissionId: 'perm-alice',
    user: { id: 'u-alice', name: 'Alice Ferreira', email: 'alice@ext.example.com' },
    group: 'EXTERNAL',
  },
  bob: {
    permissionId: 'perm-bob',
    user: { id: 'u-bob', name: 'Bob Santos', email: 'bob@collections.example.com' },
    group: 'COLLECTIONS_MANAGEMENT',
  },
  carol: {
    permissionId: 'perm-carol',
    user: { id: 'u-carol', name: 'Carol Souza', email: 'carol@curatorial.example.com' },
    group: 'CURATORIAL',
  },
  dan: {
    permissionId: 'perm-dan',
    user: { id: 'u-dan', name: 'Dan Oliveira', email: 'dan@direction.example.com' },
    group: 'DIRECTION',
  },
  eve: {
    permissionId: 'perm-eve',
    user: { id: 'u-eve', name: 'Eve Lima', email: 'eve@admin.example.com' },
    group: 'ADMIN',
  },
};

export const SEED_PROPOSALS: ProposalDetail[] = [
  {
    id: 'prop-1',
    status: 'SUBMITTED',
    type: 'RESEARCH',
    requestedBy: P['alice'],
    assignedTo: null,
    collectionUseProject: { id: 'proj-1', referenceNumber: 'VR-2026-001', title: 'Photographic history of Rio de Janeiro port, 1890–1930', status: 'REQUESTED' },
    submittedAt: '2026-05-01T10:00:00Z',
    conversationId: 'conv-1',
    documents: [],
    requestedDocuments: [],
  },
  {
    id: 'prop-2',
    status: 'PENDING_DOCUMENTS',
    type: 'RESEARCH',
    requestedBy: P['alice'],
    assignedTo: P['bob'],
    collectionUseProject: { id: 'proj-2', referenceNumber: 'VR-2026-002', title: 'Colonial-era ceramic production techniques', status: 'REQUESTED' },
    submittedAt: '2026-04-20T09:00:00Z',
    conversationId: 'conv-2',
    documents: [],
    requestedDocuments: [
      {
        id: 'rdoc-1',
        type: 'INSTITUTIONAL_LETTER',
        description: 'Official letter of support from your institution',
        requestedAt: '2026-04-22T14:00:00Z',
        requestedBy: P['bob'],
      },
    ],
  },
  {
    id: 'prop-3',
    status: 'UNDER_REVIEW',
    type: 'OTHER',
    requestedBy: P['alice'],
    assignedTo: P['carol'],
    collectionUseProject: { id: 'proj-3', referenceNumber: 'VR-2026-003', title: 'Documentary film about indigenous textile collections', status: 'REQUESTED' },
    submittedAt: '2026-04-10T11:00:00Z',
    conversationId: 'conv-3',
    documents: [
      { id: 'doc-1', type: 'INSTITUTIONAL_LETTER', fileName: 'institutional_letter.docx', submittedAt: '2026-04-15T16:30:00Z', submittedBy: P['alice'] },
    ],
    requestedDocuments: [],
  },
  {
    id: 'prop-4',
    status: 'APPROVED',
    type: 'RESEARCH',
    requestedBy: P['alice'],
    assignedTo: P['carol'],
    collectionUseProject: { id: 'proj-4', referenceNumber: 'VR-2026-004', title: 'Numismatic collection from the Imperial period', status: 'ACCEPTED' },
    submittedAt: '2026-03-15T08:00:00Z',
    conversationId: 'conv-4',
    documents: [],
    requestedDocuments: [],
  },
  {
    id: 'prop-5',
    status: 'APPROVED',
    type: 'RESEARCH',
    requestedBy: P['alice'],
    assignedTo: P['bob'],
    collectionUseProject: { id: 'proj-5', referenceNumber: 'VR-2026-005', title: 'Illuminated manuscripts from the 16th century', status: 'IN_PROGRESS' },
    submittedAt: '2026-02-10T07:00:00Z',
    conversationId: 'conv-5',
    documents: [],
    requestedDocuments: [],
  },
  {
    id: 'prop-6',
    status: 'REJECTED',
    type: 'RESEARCH',
    requestedBy: P['alice'],
    assignedTo: P['bob'],
    collectionUseProject: { id: 'proj-6', referenceNumber: 'VR-2026-006', title: 'Genealogical records research', status: 'AUTHORIZATION_REFUSED' },
    submittedAt: '2026-03-01T07:00:00Z',
    conversationId: 'conv-6',
    documents: [],
    requestedDocuments: [],
  },
];

export const SEED_PROPOSAL_EVENTS: Record<string, ProposalEvent[]> = {
  'prop-1': [
    { occurredAt: '2026-05-01T10:00:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
  ],
  'prop-2': [
    { occurredAt: '2026-04-20T09:00:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
    { occurredAt: '2026-04-21T10:00:00Z', type: 'ASSIGNED', triggeredBy: P['bob'], note: null },
    { occurredAt: '2026-04-22T14:00:00Z', type: 'DOCUMENTS_REQUESTED', triggeredBy: P['bob'], note: 'Please provide institutional support letter.' },
  ],
  'prop-3': [
    { occurredAt: '2026-04-10T11:00:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
    { occurredAt: '2026-04-11T09:00:00Z', type: 'ASSIGNED', triggeredBy: P['bob'], note: null },
    { occurredAt: '2026-04-15T18:00:00Z', type: 'DOCUMENTS_SUBMITTED', triggeredBy: P['alice'], note: null },
    { occurredAt: '2026-04-16T10:00:00Z', type: 'REVIEW_STARTED', triggeredBy: P['carol'], note: 'Starting review.' },
  ],
  'prop-4': [
    { occurredAt: '2026-03-15T08:00:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
    { occurredAt: '2026-03-16T09:00:00Z', type: 'ASSIGNED', triggeredBy: P['bob'], note: null },
    { occurredAt: '2026-03-17T10:00:00Z', type: 'REVIEW_STARTED', triggeredBy: P['carol'], note: null },
    { occurredAt: '2026-03-20T16:00:00Z', type: 'APPROVED', triggeredBy: P['carol'], note: 'Proposal meets all requirements.' },
  ],
  'prop-5': [
    { occurredAt: '2026-02-10T07:00:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
    { occurredAt: '2026-02-11T09:00:00Z', type: 'ASSIGNED', triggeredBy: P['bob'], note: null },
    { occurredAt: '2026-02-12T10:00:00Z', type: 'REVIEW_STARTED', triggeredBy: P['bob'], note: null },
    { occurredAt: '2026-02-15T14:00:00Z', type: 'APPROVED', triggeredBy: P['bob'], note: 'All criteria met.' },
  ],
  'prop-6': [
    { occurredAt: '2026-03-01T07:00:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
    { occurredAt: '2026-03-02T09:00:00Z', type: 'ASSIGNED', triggeredBy: P['bob'], note: null },
    { occurredAt: '2026-03-03T14:00:00Z', type: 'REJECTED', triggeredBy: P['bob'], note: 'Does not fall within institutional collection use policy.' },
  ],
};

export const SEED_MESSAGES: Record<string, Message[]> = {
  'conv-1': [],
  'conv-2': [
    { id: 'msg-1', sentAt: '2026-04-22T14:05:00Z', sender: 'bob@collections.example.com', recipient: 'alice@ext.example.com', subject: 'Documents required', body: 'Please send your institutional support letter.' },
  ],
  'conv-3': [],
  'conv-4': [],
  'conv-5': [],
  'conv-6': [],
};

export interface MutableProjectState {
  id: string;
  referenceNumber: string;
  title: string;
  purpose: string;
  type: 'RESEARCH' | 'OTHER';
  status: import('@shared/models/collection-use-status.model').UseStatus;
  result: import('@shared/models/collection-use-status.model').UseResult | null;
  beginDate: string;
  endDate: string;
  requestedBy: PermissionPrincipal;
  proposalId: string;
  proposalStatus: import('@shared/models/collection-use-status.model').ProposalStatus;
  proposalAssignedTo: PermissionPrincipal | null;
  entries: import('@features/projects/models/project.model').ProjectEntry[];
  entryTotal: number;
}

export const SEED_PROJECTS: MutableProjectState[] = [
  {
    id: 'proj-1', referenceNumber: 'VR-2026-001', title: 'Photographic history of Rio de Janeiro port, 1890–1930',
    purpose: 'Academic research for doctoral dissertation.', type: 'RESEARCH',
    status: 'REQUESTED', result: null, beginDate: '2026-06-01', endDate: '2026-12-31',
    requestedBy: P['alice'], proposalId: 'prop-1', proposalStatus: 'SUBMITTED', proposalAssignedTo: null,
    entries: [], entryTotal: 0,
  },
  {
    id: 'proj-2', referenceNumber: 'VR-2026-002', title: 'Colonial-era ceramic production techniques',
    purpose: 'Archaeological study for publication.', type: 'RESEARCH',
    status: 'REQUESTED', result: null, beginDate: '2026-06-15', endDate: '2027-03-31',
    requestedBy: P['alice'], proposalId: 'prop-2', proposalStatus: 'PENDING_DOCUMENTS', proposalAssignedTo: P['bob'],
    entries: [], entryTotal: 0,
  },
  {
    id: 'proj-4', referenceNumber: 'VR-2026-004', title: 'Numismatic collection from the Imperial period',
    purpose: 'Cataloguing and publication of numismatic pieces.', type: 'RESEARCH',
    status: 'ACCEPTED', result: null, beginDate: '2026-05-01', endDate: '2026-11-30',
    requestedBy: P['alice'], proposalId: 'prop-4', proposalStatus: 'APPROVED', proposalAssignedTo: P['carol'],
    entries: [], entryTotal: 0,
  },
  {
    id: 'proj-5', referenceNumber: 'VR-2026-005', title: 'Illuminated manuscripts from the 16th century',
    purpose: 'High-resolution digitisation for academic publication.', type: 'RESEARCH',
    status: 'IN_PROGRESS', result: null, beginDate: '2026-04-01', endDate: '2026-10-31',
    requestedBy: P['alice'], proposalId: 'prop-5', proposalStatus: 'APPROVED', proposalAssignedTo: P['bob'],
    entries: [
      {
        id: 'entry-1',
        content: 'First session completed. Photographed folios 1–40 of the codex.',
        addedAt: '2026-04-05T14:00:00Z',
        addedBy: P['alice'],
        attachments: [],
      },
    ],
    entryTotal: 1,
  },
];

export const SEED_PROJECT_EVENTS: Record<string, UseEvent[]> = {
  'proj-1': [
    { occurredAt: '2026-05-01T10:00:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
  ],
  'proj-2': [
    { occurredAt: '2026-04-20T09:00:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
  ],
  'proj-4': [
    { occurredAt: '2026-03-15T08:00:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
    { occurredAt: '2026-03-20T16:00:00Z', type: 'ACCEPTED', triggeredBy: P['carol'], note: null },
  ],
  'proj-5': [
    { occurredAt: '2026-02-10T07:00:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
    { occurredAt: '2026-02-15T14:00:00Z', type: 'ACCEPTED', triggeredBy: P['bob'], note: null },
    { occurredAt: '2026-03-01T09:00:00Z', type: 'STARTED', triggeredBy: P['alice'], note: 'Starting collection access.' },
  ],
};

export const SEED_PROJECT_ENTRIES: Record<string, ProjectEntry[]> = {
  'proj-1': [],
  'proj-2': [],
  'proj-4': [],
  'proj-5': [
    {
      id: 'entry-1',
      content: 'First session completed. Photographed folios 1–40 of the codex.',
      addedAt: '2026-04-05T14:00:00Z',
      addedBy: P['alice'],
      attachments: [],
    },
  ],
};

export function makePageFrom<T>(items: readonly T[], query: PageQuery): Page<T> {
  const page = query.page ?? 0;
  const size = query.size ?? 20;
  const start = page * size;
  return {
    content: items.slice(start, start + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  };
}
