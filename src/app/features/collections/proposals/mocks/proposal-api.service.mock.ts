import { inject, Injectable } from '@angular/core';
import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { Page, PageQuery } from 'src/app/shared/models/page.model';
import { Observable, of, throwError } from 'rxjs';

import {
  AddProposalWatcherRequest,
  AssignProposalRequest,
  DirectionClarificationRequest,
  ForwardProposalRequest,
  ProposalAssignmentResult,
  ProposalDecisionResult,
  ProposalNoteRequest,
  ProposalReasonRequest,
  ProposalStatusActionResult,
  ReferToDirectionRequest,
  RequestDocumentsRequest,
  RequestDocumentsResult,
} from '../models/proposal-actions.model';
import {
  Conversation,
  CreateProposalRequest,
  CreateProposalResponse,
  Document,
  Message,
  ProposalDetail,
  ProposalDocumentsResponse,
  ProposalEventsPage,
  ProposalEvent,
  ProposalListQuery,
  ProposalSummary,
  SendMessageRequest,
} from '../models/proposal.model';
import {
  makePageFrom,
  MOCK_USERS,
  P,
  SEED_MESSAGES,
  SEED_PROPOSALS,
  SEED_PROPOSAL_EVENTS,
} from './mock-data';

@Injectable()
export class ProposalApiServiceMock {
  private readonly identity = inject(IDENTITY_SERVICE);
  private readonly proposals = new Map<string, ProposalDetail>(
    SEED_PROPOSALS.map((p) => [p.id, structuredClone(p)]),
  );
  private readonly events = new Map<string, ProposalEvent[]>(
    Object.entries(SEED_PROPOSAL_EVENTS).map(([k, v]) => [k, structuredClone(v)]),
  );
  private readonly messages = new Map<string, Message[]>(
    Object.entries(SEED_MESSAGES).map(([k, v]) => [k, structuredClone(v)]),
  );
  private nextId = 100;

  createProposal(request: CreateProposalRequest): Observable<CreateProposalResponse> {
    const id = `prop-${this.nextId}`;
    const projectId = `proj-${this.nextId}`;
    this.nextId++;
    const now = new Date().toISOString();
    const refNum = `VR-${new Date().getFullYear()}-${String(this.proposals.size + 1).padStart(3, '0')}`;
    const convId = `conv-${id}`;

    const proposal: ProposalDetail = {
      id,
      status: 'SUBMITTED',
      type: request.type,
      requestedBy: P['alice'],
      assignedTo: null,
      collectionUseProject: {
        id: projectId,
        referenceNumber: refNum,
        title: request.title,
        status: 'REQUESTED',
      },
      submittedAt: now,
      watchers: [],
      conversationId: convId,
      documents: [],
      requestedDocuments: [],
    };

    this.proposals.set(id, proposal);
    this.events.set(id, [
      { occurredAt: now, type: 'SUBMITTED', triggeredBy: P['alice'], note: null },
    ]);
    this.messages.set(convId, []);

    return of({
      proposal: {
        id: proposal.id,
        status: proposal.status,
        type: proposal.type,
        requestedBy: proposal.requestedBy,
        assignedTo: proposal.assignedTo,
        submittedAt: proposal.submittedAt,
        collectionUseProject: proposal.collectionUseProject,
      },
      collectionUseProject: {
        id: projectId,
        referenceNumber: refNum,
        title: request.title,
        purpose: request.purpose,
        type: request.type,
        status: 'REQUESTED',
        beginDate: request.beginDate,
        endDate: request.endDate,
      },
      conversationId: convId,
    });
  }

  listProposals(query: ProposalListQuery = {}): Observable<Page<ProposalSummary>> {
    let items = [...this.proposals.values()];

    if (query.status) items = items.filter((p) => p.status === query.status);
    if (query.type) items = items.filter((p) => p.type === query.type);
    if (query.unassigned) items = items.filter((p) => p.assignedTo === null);
    if (query.assignedTo)
      items = items.filter((p) => p.assignedTo?.permissionId === query.assignedTo);
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.collectionUseProject.title.toLowerCase().includes(q) ||
          p.collectionUseProject.referenceNumber.toLowerCase().includes(q),
      );
    }

    const summaries: ProposalSummary[] = items.map((p) => ({
      id: p.id,
      status: p.status,
      type: p.type,
      requestedBy: p.requestedBy,
      assignedTo: p.assignedTo,
      collectionUseProject: p.collectionUseProject,
      submittedAt: p.submittedAt,
    }));

    return of(makePageFrom(summaries, query));
  }

  getProposal(proposalId: string): Observable<ProposalDetail> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    return of(proposal);
  }

  uploadDocument(proposalId: string, _file: File, documentType: string): Observable<Document> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const doc: Document = {
      id: `doc-${this.nextId++}`,
      type: documentType,
      fileName: _file.name,
      submittedAt: now,
      submittedBy: P['alice'],
    };
    const updated: ProposalDetail = { ...proposal, documents: [...proposal.documents, doc] };
    this.proposals.set(proposalId, updated);
    const evts = this.events.get(proposalId) ?? [];
    evts.push({
      occurredAt: now,
      type: 'DOCUMENTS_SUBMITTED',
      triggeredBy: P['alice'],
      note: null,
    });
    return of(doc);
  }

  listDocuments(proposalId: string): Observable<ProposalDocumentsResponse> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    return of({ proposalId, documents: proposal.documents });
  }

  listEvents(proposalId: string, query: PageQuery = {}): Observable<ProposalEventsPage> {
    const evts = this.events.get(proposalId) ?? [];
    return of({ ...makePageFrom(evts, query), proposalId });
  }

  getConversation(proposalId: string, query: PageQuery = {}): Observable<Conversation> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const msgs = this.messages.get(proposal.conversationId) ?? [];
    const page = makePageFrom(msgs, query);
    return of({
      conversationId: proposal.conversationId,
      proposalId,
      messages: page.content,
      page: page.page,
      size: page.size,
      totalElements: page.totalElements,
      totalPages: page.totalPages,
    });
  }

  sendMessage(proposalId: string, request: SendMessageRequest): Observable<Message> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const msg: Message = {
      id: `msg-${this.nextId++}`,
      sentAt: new Date().toISOString(),
      sender: P['alice'].user.email,
      recipient: request.recipient,
      subject: request.subject,
      body: request.body,
    };
    const msgs = this.messages.get(proposal.conversationId) ?? [];
    msgs.push(msg);
    this.messages.set(proposal.conversationId, msgs);
    return of(msg);
  }

  assignProposal(
    proposalId: string,
    request: AssignProposalRequest,
  ): Observable<ProposalAssignmentResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const assignedTo = request.targetPermissionId
      ? (this.findPrincipalByPermissionId(request.targetPermissionId) ?? P['bob'])
      : this.currentPrincipal();
    const evt: ProposalEvent = {
      occurredAt: now,
      type: 'ASSIGNED',
      triggeredBy: assignedTo,
      note: request.note || null,
    };
    this.proposals.set(proposalId, { ...proposal, assignedTo });
    (this.events.get(proposalId) ?? []).push(evt);
    return of({ id: proposalId, status: proposal.status, assignedTo, lastEvent: evt });
  }

  requestDocuments(
    proposalId: string,
    request: RequestDocumentsRequest,
  ): Observable<RequestDocumentsResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const newDocs = request.requiredDocuments.map((d, i) => ({
      id: `rdoc-${this.nextId++}-${i}`,
      type: d.type,
      description: d.description,
      requestedAt: now,
      requestedBy: P['bob'],
    }));
    const evt: ProposalEvent = {
      occurredAt: now,
      type: 'DOCUMENTS_REQUESTED',
      triggeredBy: P['bob'],
      note: request.note || null,
    };
    this.proposals.set(proposalId, {
      ...proposal,
      status: 'PENDING_DOCUMENTS',
      requestedDocuments: [...proposal.requestedDocuments, ...newDocs],
    });
    (this.events.get(proposalId) ?? []).push(evt);
    return of({
      id: proposalId,
      status: 'PENDING_DOCUMENTS',
      requestedDocuments: newDocs,
      lastEvent: evt,
    });
  }

  forwardProposal(
    proposalId: string,
    request: ForwardProposalRequest,
  ): Observable<ProposalAssignmentResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const assignedTo = this.findPrincipalByPermissionId(request.targetPermissionId) ?? P['carol'];
    const evt: ProposalEvent = {
      occurredAt: now,
      type: 'FORWARDED',
      triggeredBy: P['bob'],
      note: request.note || null,
    };
    this.proposals.set(proposalId, { ...proposal, assignedTo });
    (this.events.get(proposalId) ?? []).push(evt);
    return of({ id: proposalId, status: proposal.status, assignedTo, lastEvent: evt });
  }

  addWatcher(
    proposalId: string,
    request: AddProposalWatcherRequest,
  ): Observable<PermissionPrincipal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));

    const watcher = this.findPrincipalByPermissionId(request.permissionId);
    if (!watcher) return throwError(() => ({ status: 404, error: 'PERMISSION_NOT_FOUND' }));

    if (!proposal.watchers.some((w) => w.permissionId === watcher.permissionId)) {
      this.proposals.set(proposalId, {
        ...proposal,
        watchers: [...proposal.watchers, watcher],
      });
    }

    return of(watcher);
  }

  removeWatcher(proposalId: string, permissionId: string): Observable<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));

    if (!proposal.watchers.some((w) => w.permissionId === permissionId)) {
      return throwError(() => ({ status: 404, error: 'WATCHER_NOT_FOUND' }));
    }

    this.proposals.set(proposalId, {
      ...proposal,
      watchers: proposal.watchers.filter((w) => w.permissionId !== permissionId),
    });

    return of(undefined);
  }

  startReview(
    proposalId: string,
    request: ProposalNoteRequest,
  ): Observable<ProposalStatusActionResult> {
    return this.transitionProposal(proposalId, 'UNDER_REVIEW', 'REVIEW_STARTED', request.note);
  }

  referToDirection(
    proposalId: string,
    request: ReferToDirectionRequest,
  ): Observable<ProposalStatusActionResult> {
    return this.transitionProposal(
      proposalId,
      'PENDING_DIRECTION',
      'REFERRED_TO_DIRECTION',
      request.note,
    );
  }

  clarifyDirection(
    proposalId: string,
    request: DirectionClarificationRequest,
  ): Observable<ProposalStatusActionResult> {
    return this.transitionProposal(proposalId, 'UNDER_REVIEW', 'DIRECTION_CLARIFIED', request.note);
  }

  approveProposal(
    proposalId: string,
    request: ProposalNoteRequest,
  ): Observable<ProposalDecisionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const evt: ProposalEvent = {
      occurredAt: now,
      type: 'APPROVED',
      triggeredBy: P['carol'],
      note: request.note || null,
    };
    this.proposals.set(proposalId, {
      ...proposal,
      status: 'APPROVED',
      collectionUseProject: { ...proposal.collectionUseProject, status: 'ACCEPTED' },
    });
    (this.events.get(proposalId) ?? []).push(evt);
    return of({
      proposal: { id: proposalId, status: 'APPROVED', lastEvent: evt },
      collectionUseProject: { ...proposal.collectionUseProject, status: 'ACCEPTED' },
    });
  }

  rejectProposal(
    proposalId: string,
    request: ProposalReasonRequest,
  ): Observable<ProposalDecisionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const evt: ProposalEvent = {
      occurredAt: now,
      type: 'REJECTED',
      triggeredBy: P['bob'],
      note: request.reason,
    };
    this.proposals.set(proposalId, {
      ...proposal,
      status: 'REJECTED',
      collectionUseProject: { ...proposal.collectionUseProject, status: 'REFUSED' },
    });
    (this.events.get(proposalId) ?? []).push(evt);
    return of({
      proposal: { id: proposalId, status: 'REJECTED', lastEvent: evt },
      collectionUseProject: { ...proposal.collectionUseProject, status: 'REFUSED' },
    });
  }

  cancelProposal(
    proposalId: string,
    request: ProposalReasonRequest,
  ): Observable<ProposalDecisionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const evt: ProposalEvent = {
      occurredAt: now,
      type: 'CANCELLED',
      triggeredBy: P['alice'],
      note: request.reason,
    };
    this.proposals.set(proposalId, {
      ...proposal,
      status: 'CANCELLED',
      collectionUseProject: { ...proposal.collectionUseProject, status: 'CANCELLED' },
    });
    (this.events.get(proposalId) ?? []).push(evt);
    return of({
      proposal: { id: proposalId, status: 'CANCELLED', lastEvent: evt },
      collectionUseProject: {
        ...proposal.collectionUseProject,
        status: 'CANCELLED',
        result: 'CANCELLED',
      },
    });
  }

  private transitionProposal(
    proposalId: string,
    newStatus: ProposalDetail['status'],
    eventType: ProposalEvent['type'],
    note: string,
  ): Observable<ProposalStatusActionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const evt: ProposalEvent = {
      occurredAt: now,
      type: eventType,
      triggeredBy: P['carol'],
      note: note || null,
    };
    this.proposals.set(proposalId, { ...proposal, status: newStatus });
    (this.events.get(proposalId) ?? []).push(evt);
    return of({ id: proposalId, status: newStatus, lastEvent: evt });
  }

  private currentPrincipal(): PermissionPrincipal {
    const session = this.identity.session();
    const permission = session
      ? MOCK_USERS.find(
          (u) => u.id === session.user.id || u.email === session.user.email,
        )?.permissions.find((p) => p.group.name === session.group)
      : null;

    if (!session || !permission) return P['bob'];

    return {
      permissionId: permission.permissionId,
      user: {
        id: session.user.id,
        name: session.user.displayName,
        email: session.user.email,
      },
      group: permission.group.name,
    };
  }

  private findPrincipalByPermissionId(permissionId: string): PermissionPrincipal | null {
    const user = MOCK_USERS.find((u) => u.permissions.some((p) => p.permissionId === permissionId));
    const permission = user?.permissions.find((p) => p.permissionId === permissionId);

    if (!user || !permission) return null;

    return {
      permissionId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      group: permission.group.name,
    };
  }
}
