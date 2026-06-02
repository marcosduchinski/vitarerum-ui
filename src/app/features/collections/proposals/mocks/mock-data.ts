import { Injectable } from '@angular/core';
import { Group } from 'src/app/core/auth/models/group.model';
import { GroupMembership, PermissionPrincipal } from 'src/app/core/auth/models/permission.model';
import { UserDetail } from 'src/app/core/auth/models/user.model';
import { Page, PageQuery } from 'src/app/shared/models/page.model';

import { ProjectEntry, UseEvent } from 'src/app/features/collections/projects/models/project.model';
import {
  CreateProposalRequest,
  Message,
  ProposalDetail,
  ProposalEvent,
} from '../models/proposal.model';

export const MOCK_GROUPS: Group[] = [
  { id: 'g-external', name: 'EXTERNAL' },
  { id: 'g-collections', name: 'COLLECTIONS_MANAGEMENT' },
  { id: 'g-curatorial', name: 'CURATORIAL' },
  { id: 'g-direction', name: 'DIRECTION' },
  { id: 'g-admin', name: 'ADMINISTRATION' },
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
      { permissionId: 'perm-fran-curatorial', group: MOCK_GROUPS[2] },
      { permissionId: 'perm-fran-direction', group: MOCK_GROUPS[3] },
    ],
  },
  {
    id: 'u-greg',
    name: 'Greg Viana',
    email: 'greg@collections.example.com',
    permissions: [{ permissionId: 'perm-greg', group: MOCK_GROUPS[1] }],
  },
];

export const MOCK_MEMBERSHIPS: GroupMembership[] = [
  { permissionId: 'perm-alice', user: MOCK_USERS[0], group: MOCK_GROUPS[0] },
  { permissionId: 'perm-bob', user: MOCK_USERS[1], group: MOCK_GROUPS[1] },
  { permissionId: 'perm-carol', user: MOCK_USERS[2], group: MOCK_GROUPS[2] },
  { permissionId: 'perm-dan', user: MOCK_USERS[3], group: MOCK_GROUPS[3] },
  { permissionId: 'perm-eve', user: MOCK_USERS[4], group: MOCK_GROUPS[4] },
  { permissionId: 'perm-fran-collections', user: MOCK_USERS[5], group: MOCK_GROUPS[1] },
  { permissionId: 'perm-fran-curatorial', user: MOCK_USERS[5], group: MOCK_GROUPS[2] },
  { permissionId: 'perm-fran-direction', user: MOCK_USERS[5], group: MOCK_GROUPS[3] },
  { permissionId: 'perm-greg', user: MOCK_USERS[6], group: MOCK_GROUPS[1] },
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
    group: 'ADMINISTRATION',
  },
  greg: {
    permissionId: 'perm-greg',
    user: { id: 'u-greg', name: 'Greg Viana', email: 'greg@collections.example.com' },
    group: 'COLLECTIONS_MANAGEMENT',
  },
};

export const SEED_PROPOSALS: ProposalDetail[] = [
  {
    id: 'prop-1',
    status: 'SUBMITTED',
    type: 'RESEARCH',
    requestedBy: P['alice'],
    assignedTo: null,
    collectionUseProject: {
      id: 'proj-1',
      referenceNumber: 'VR-2026-001',
      title: 'Zoology specimen catalogues from Atlantic forest surveys',
      status: 'REQUESTED',
    },
    submittedAt: '2026-06-01T09:00:00Z',
    watchers: [],
    conversationId: 'conv-1',
    documents: [],
    requestedDocuments: [],
  },
  {
    id: 'prop-2',
    status: 'SUBMITTED',
    type: 'RESEARCH',
    requestedBy: P['alice'],
    assignedTo: null,
    collectionUseProject: {
      id: 'proj-2',
      referenceNumber: 'VR-2026-002',
      title: 'Botanical herbarium records of medicinal plant collections',
      status: 'REQUESTED',
    },
    submittedAt: '2026-06-01T09:20:00Z',
    watchers: [],
    conversationId: 'conv-2',
    documents: [],
    requestedDocuments: [],
  },
  {
    id: 'prop-3',
    status: 'SUBMITTED',
    type: 'RESEARCH',
    requestedBy: P['alice'],
    assignedTo: null,
    collectionUseProject: {
      id: 'proj-3',
      referenceNumber: 'VR-2026-003',
      title: 'Comparative study of zoological field notebooks',
      status: 'REQUESTED',
    },
    submittedAt: '2026-06-01T09:40:00Z',
    watchers: [],
    conversationId: 'conv-3',
    documents: [],
    requestedDocuments: [],
  },
  {
    id: 'prop-4',
    status: 'SUBMITTED',
    type: 'EXHIBITION',
    requestedBy: P['alice'],
    assignedTo: null,
    collectionUseProject: {
      id: 'proj-4',
      referenceNumber: 'VR-2026-004',
      title: 'Science history exhibition on early laboratory instruments',
      status: 'REQUESTED',
    },
    submittedAt: '2026-06-01T10:00:00Z',
    watchers: [],
    conversationId: 'conv-4',
    documents: [],
    requestedDocuments: [],
  },
  {
    id: 'prop-5',
    status: 'SUBMITTED',
    type: 'EXHIBITION',
    requestedBy: P['alice'],
    assignedTo: null,
    collectionUseProject: {
      id: 'proj-5',
      referenceNumber: 'VR-2026-005',
      title: 'Science history exhibition on expedition photography',
      status: 'REQUESTED',
    },
    submittedAt: '2026-06-01T10:20:00Z',
    watchers: [],
    conversationId: 'conv-5',
    documents: [],
    requestedDocuments: [],
  },
  {
    id: 'prop-6',
    status: 'SUBMITTED',
    type: 'EXHIBITION',
    requestedBy: P['alice'],
    assignedTo: null,
    collectionUseProject: {
      id: 'proj-6',
      referenceNumber: 'VR-2026-006',
      title: 'Science history exhibition on botanical illustration',
      status: 'REQUESTED',
    },
    submittedAt: '2026-06-01T10:40:00Z',
    watchers: [],
    conversationId: 'conv-6',
    documents: [],
    requestedDocuments: [],
  },
];

export const SEED_PROPOSAL_EVENTS: Record<string, ProposalEvent[]> = {
  'prop-1': [
    { occurredAt: '2026-06-01T09:00:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
  ],
  'prop-2': [
    { occurredAt: '2026-06-01T09:20:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
  ],
  'prop-3': [
    { occurredAt: '2026-06-01T09:40:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
  ],
  'prop-4': [
    { occurredAt: '2026-06-01T10:00:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
  ],
  'prop-5': [
    { occurredAt: '2026-06-01T10:20:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
  ],
  'prop-6': [
    { occurredAt: '2026-06-01T10:40:00Z', type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
  ],
};

export const SEED_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-prop-1-initial',
      sentAt: '2026-06-01T09:00:00Z',
      sender: P['alice'].user.email,
      recipient: 'collections@vitarerum.example.com',
      subject: 'Collection use request: VR-2026-001',
      body: 'I am requesting access to the zoology specimen catalogues from Atlantic forest surveys for comparative research on collecting routes and specimen records.',
    },
  ],
  'conv-2': [
    {
      id: 'msg-prop-2-initial',
      sentAt: '2026-06-01T09:20:00Z',
      sender: P['alice'].user.email,
      recipient: 'collections@vitarerum.example.com',
      subject: 'Collection use request: VR-2026-002',
      body: 'I am requesting access to botanical herbarium records of medicinal plant collections for research on classification history and documented uses.',
    },
  ],
  'conv-3': [
    {
      id: 'msg-prop-3-initial',
      sentAt: '2026-06-01T09:40:00Z',
      sender: P['alice'].user.email,
      recipient: 'collections@vitarerum.example.com',
      subject: 'Collection use request: VR-2026-003',
      body: 'I am requesting access to zoological field notebooks, sketches, and specimen lists for a comparative research study.',
    },
  ],
  'conv-4': [
    {
      id: 'msg-prop-4-initial',
      sentAt: '2026-06-01T10:00:00Z',
      sender: P['alice'].user.email,
      recipient: 'collections@vitarerum.example.com',
      subject: 'Collection use request: VR-2026-004',
      body: 'I am requesting use of early laboratory instrument materials for a science history exhibition about experimental practice and public education.',
    },
  ],
  'conv-5': [
    {
      id: 'msg-prop-5-initial',
      sentAt: '2026-06-01T10:20:00Z',
      sender: P['alice'].user.email,
      recipient: 'collections@vitarerum.example.com',
      subject: 'Collection use request: VR-2026-005',
      body: 'I am requesting use of expedition photography materials for a public science history exhibition on documentation and fieldwork.',
    },
  ],
  'conv-6': [
    {
      id: 'msg-prop-6-initial',
      sentAt: '2026-06-01T10:40:00Z',
      sender: P['alice'].user.email,
      recipient: 'collections@vitarerum.example.com',
      subject: 'Collection use request: VR-2026-006',
      body: 'I am requesting use of botanical illustration materials for a science history exhibition about observation, drawing, and botanical knowledge.',
    },
  ],
};

export interface MutableProjectState {
  id: string;
  referenceNumber: string;
  title: string;
  purpose: string;
  type: 'EXHIBITION' | 'RESEARCH' | 'OTHER';
  status: import('src/app/shared/models/collection-use-status.model').UseStatus;
  result: import('src/app/shared/models/collection-use-status.model').UseResult | null;
  beginDate: string;
  endDate: string;
  requestedBy: PermissionPrincipal;
  proposalId: string;
  proposalStatus: import('src/app/shared/models/collection-use-status.model').ProposalStatus;
  proposalAssignedTo: PermissionPrincipal | null;
  entries: import('src/app/features/collections/projects/models/project.model').ProjectEntry[];
  entryTotal: number;
}

export const SEED_PROJECTS: MutableProjectState[] = [
  {
    id: 'proj-1',
    referenceNumber: 'VR-2026-001',
    title: 'Zoology specimen catalogues from Atlantic forest surveys',
    purpose: 'Research comparing zoological specimen catalogues and collecting routes.',
    type: 'RESEARCH',
    status: 'REQUESTED',
    result: null,
    beginDate: '2026-06-01',
    endDate: '2026-12-31',
    requestedBy: P['alice'],
    proposalId: 'prop-1',
    proposalStatus: 'SUBMITTED',
    proposalAssignedTo: null,
    entries: [],
    entryTotal: 0,
  },
  {
    id: 'proj-2',
    referenceNumber: 'VR-2026-002',
    title: 'Botanical herbarium records of medicinal plant collections',
    purpose: 'Research on botanical herbarium records and medicinal plant classification.',
    type: 'RESEARCH',
    status: 'REQUESTED',
    result: null,
    beginDate: '2026-07-15',
    endDate: '2027-01-31',
    requestedBy: P['alice'],
    proposalId: 'prop-2',
    proposalStatus: 'SUBMITTED',
    proposalAssignedTo: null,
    entries: [],
    entryTotal: 0,
  },
  {
    id: 'proj-3',
    referenceNumber: 'VR-2026-003',
    title: 'Comparative study of zoological field notebooks',
    purpose: 'Research comparing zoological field notebooks, sketches, and specimen lists.',
    type: 'RESEARCH',
    status: 'REQUESTED',
    result: null,
    beginDate: '2026-09-01',
    endDate: '2027-02-28',
    requestedBy: P['alice'],
    proposalId: 'prop-3',
    proposalStatus: 'SUBMITTED',
    proposalAssignedTo: null,
    entries: [],
    entryTotal: 0,
  },
  {
    id: 'proj-4',
    referenceNumber: 'VR-2026-004',
    title: 'Science history exhibition on early laboratory instruments',
    purpose: 'Preparation of early laboratory instruments for a science history exhibition.',
    type: 'EXHIBITION',
    status: 'REQUESTED',
    result: null,
    beginDate: '2026-08-10',
    endDate: '2027-01-15',
    requestedBy: P['alice'],
    proposalId: 'prop-4',
    proposalStatus: 'SUBMITTED',
    proposalAssignedTo: null,
    entries: [],
    entryTotal: 0,
  },
  {
    id: 'proj-5',
    referenceNumber: 'VR-2026-005',
    title: 'Science history exhibition on expedition photography',
    purpose: 'Selection of expedition photographs for a public science history exhibition.',
    type: 'EXHIBITION',
    status: 'REQUESTED',
    result: null,
    beginDate: '2026-06-15',
    endDate: '2026-09-30',
    requestedBy: P['alice'],
    proposalId: 'prop-5',
    proposalStatus: 'SUBMITTED',
    proposalAssignedTo: null,
    entries: [],
    entryTotal: 0,
  },
  {
    id: 'proj-6',
    referenceNumber: 'VR-2026-006',
    title: 'Science history exhibition on botanical illustration',
    purpose:
      'Selection and display of botanical illustration materials for a science history exhibition.',
    type: 'EXHIBITION',
    status: 'REQUESTED',
    result: null,
    beginDate: '2026-07-01',
    endDate: '2026-10-15',
    requestedBy: P['alice'],
    proposalId: 'prop-6',
    proposalStatus: 'SUBMITTED',
    proposalAssignedTo: null,
    entries: [],
    entryTotal: 0,
  },
];

export const SEED_PROJECT_EVENTS: Record<string, UseEvent[]> = {
  'proj-1': [
    { occurredAt: '2026-06-01T09:00:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
  ],
  'proj-2': [
    { occurredAt: '2026-06-01T09:20:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
  ],
  'proj-3': [
    { occurredAt: '2026-06-01T09:40:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
  ],
  'proj-4': [
    { occurredAt: '2026-06-01T10:00:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
  ],
  'proj-5': [
    { occurredAt: '2026-06-01T10:20:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
  ],
  'proj-6': [
    { occurredAt: '2026-06-01T10:40:00Z', type: 'REQUESTED', triggeredBy: P['alice'], note: null },
  ],
};

export const SEED_PROJECT_ENTRIES: Record<string, ProjectEntry[]> = {
  'proj-1': [],
  'proj-2': [],
  'proj-3': [],
  'proj-4': [],
  'proj-5': [],
  'proj-6': [],
};

@Injectable({ providedIn: 'root' })
export class MockProjectState {
  readonly projects = new Map<string, MutableProjectState>(
    SEED_PROJECTS.map((p) => [p.id, structuredClone(p)]),
  );
  readonly entries = new Map<string, ProjectEntry[]>(
    Object.entries(SEED_PROJECT_ENTRIES).map(([k, v]) => [k, structuredClone(v)]),
  );
  readonly events = new Map<string, UseEvent[]>(
    Object.entries(SEED_PROJECT_EVENTS).map(([k, v]) => [k, structuredClone(v)]),
  );
  private nextId = 200;

  createRequestedProject(
    proposal: ProposalDetail,
    request: CreateProposalRequest,
    referenceNumber: string,
  ): void {
    const project: MutableProjectState = {
      id: proposal.collectionUseProject.id,
      referenceNumber,
      title: request.title,
      purpose: request.purpose,
      type: request.type,
      status: 'REQUESTED',
      result: null,
      beginDate: request.beginDate,
      endDate: request.endDate,
      requestedBy: proposal.requestedBy,
      proposalId: proposal.id,
      proposalStatus: proposal.status,
      proposalAssignedTo: proposal.assignedTo,
      entries: [],
      entryTotal: 0,
    };
    this.projects.set(project.id, project);
    this.entries.set(project.id, []);
    this.events.set(project.id, [
      {
        occurredAt: proposal.submittedAt,
        type: 'REQUESTED',
        triggeredBy: proposal.requestedBy,
        note: null,
      },
    ]);
  }

  acceptProjectForProposal(
    proposal: ProposalDetail,
    occurredAt: string,
  ): MutableProjectState | null {
    const project = this.projects.get(proposal.collectionUseProject.id);
    if (!project) return null;

    project.status = 'ACCEPTED';
    project.result = null;
    project.proposalStatus = 'APPROVED';
    project.proposalAssignedTo = proposal.assignedTo;

    const event: UseEvent = {
      occurredAt,
      type: 'ACCEPTED',
      triggeredBy: P['carol'],
      note: null,
    };
    const currentEvents = this.events.get(project.id) ?? [];
    currentEvents.push(event);
    this.events.set(project.id, currentEvents);
    return project;
  }

  nextEntryId(): string {
    return `entry-${this.nextId++}`;
  }

  nextFileReference(): string {
    return `mock-ref-${this.nextId++}`;
  }
}

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
