import { inject, Injectable } from '@angular/core';
import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { Page, PageQuery } from '@shared/models/page.model';
import { Observable, of, throwError } from 'rxjs';

import {
  AddProposalWatcherRequest,
  AddRequestedObjectsRequest,
  ApproveProposalRequest,
  AssignProposalRequest,
  DirectionClarificationRequest,
  ForwardProposalRequest,
  ProposalAssignmentResult,
  ProposalDecisionResult,
  ProposalEventResult,
  ProposalNoteRequest,
  ProposalReasonRequest,
  ReferToDirectionRequest,
} from '../models/proposal-actions.model';
import {
  Conversation,
  CreateProposalRequest,
  CreateProposalResponse,
  Document,
  Message,
  MessageAttachment,
  ProposalDetail,
  ProposalDocumentsResponse,
  ProposalEventsPage,
  ProposalEvent,
  ProposalListQuery,
  ProposalSummary,
  RequestedObject,
  SendMessageRequest,
} from '../models/proposal.model';
import {
  makePageFrom,
  MOCK_SEED,
  MOCK_USERS,
  MockProjectState,
  P,
} from './mock-data';

@Injectable()
export class ProposalApiServiceMock {
  private readonly seed = inject(MOCK_SEED, { optional: true });
  private readonly identity = inject(IDENTITY_SERVICE);
  private readonly projectState = inject(MockProjectState);
  private readonly proposals = new Map<string, ProposalDetail>(
    (this.seed?.proposals ?? []).map((p) => [p.id, structuredClone(p)]),
  );
  private readonly events = new Map<string, ProposalEvent[]>(
    Object.entries(this.seed?.proposalEvents ?? {}).map(([k, v]) => [k, structuredClone(v)]),
  );
  private readonly messages = new Map<string, Message[]>(
    Object.entries(this.seed?.messages ?? {}).map(([k, v]) => [k, structuredClone(v)]),
  );
  private nextId = 100;

  createProposal(request: CreateProposalRequest): Observable<CreateProposalResponse> {
    const id = `prop-${this.nextId}`;
    const projectId = `proj-${this.nextId}`;
    this.nextId++;
    const now = new Date().toISOString();
    const seq = this.proposals.size + 1;
    const proposalRef = `VRP-${now.slice(0, 10).replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;
    const refNum = `VR-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
    const convId = `conv-${id}`;

    const proposal: ProposalDetail = {
      id,
      referenceNumber: proposalRef,
      title: request.title,
      status: 'SUBMITTED',
      type: request.type,
      requestedBy: this.currentPrincipal(),
      assignedTo: null,
      collectionUseProject: {
        id: projectId,
        referenceNumber: refNum,
        title: request.title,
        status: 'CREATED',
      },
      submittedAt: now,
      watchers: [],
      conversationId: convId,
      documents: [],
      requestedObjects: [],
    };

    this.proposals.set(id, proposal);
    this.projectState.createRequestedProject(proposal, request, refNum);
    this.events.set(id, [
      { occurredAt: now, type: 'SUBMITTED', triggeredBy: this.currentPrincipal(), note: null },
    ]);
    // Business Rule 01: a proposal opens with one message. The conversation is
    // seeded from the request's initialMessage* fields, falling back to
    // recipient → collections@…, subject → title, body → purpose.
    this.messages.set(convId, [
      {
        id: `msg-${this.nextId++}`,
        sentAt: now,
        sender: this.currentPrincipal().user.email,
        recipient: request.initialMessageRecipient ?? 'collections@vitarerum.example.com',
        subject: request.initialMessageSubject ?? request.title,
        body: request.initialMessageBody ?? request.purpose,
      },
    ]);

    return of({
      proposal: {
        id: proposal.id,
        referenceNumber: proposal.referenceNumber,
        title: proposal.title,
        status: proposal.status,
        type: proposal.type,
        requestedBy: proposal.requestedBy,
        assignedTo: proposal.assignedTo,
        submittedAt: proposal.submittedAt,
      },
      conversationId: convId,
    });
  }

  listProposals(query: ProposalListQuery = {}): Observable<Page<ProposalSummary>> {
    let items = [...this.proposals.values()];

    if (query.status) items = items.filter((p) => p.status === query.status);
    if (query.type) items = items.filter((p) => p.type === query.type);
    if (query.requestedBy)
      items = items.filter((p) => p.requestedBy.permissionId === query.requestedBy);
    if (query.assignedTo)
      items = items.filter((p) => p.assignedTo?.permissionId === query.assignedTo);
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.referenceNumber.toLowerCase().includes(q),
      );
    }

    const summaries: ProposalSummary[] = items.map((p) => ({
      id: p.id,
      referenceNumber: p.referenceNumber,
      title: p.title,
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

  addRequestedObjects(
    proposalId: string,
    request: AddRequestedObjectsRequest,
  ): Observable<ProposalDetail> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const added: RequestedObject[] = request.objects.map((o) => ({
      id: `reqobj-${this.nextId++}`,
      objectReference: {
        inventoryNumber: o.inventoryNumber,
        displayTitle: null,
        objectName: null,
        briefDescriptionSnapshot: null,
      },
      category: o.category ?? '',
      description: o.description ?? '',
      requestedAt: now,
      requestedBy: this.currentPrincipal(),
    }));
    const updated: ProposalDetail = {
      ...proposal,
      requestedObjects: [...proposal.requestedObjects, ...added],
    };
    this.proposals.set(proposalId, updated);
    return of(updated);
  }

  uploadDocument(proposalId: string, _file: File, documentType: string): Observable<Document> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const doc: Document = {
      id: `doc-${this.nextId++}`,
      type: documentType,
      fileName: _file.name,
      fileReference: `mock-proposal-file-${this.nextId++}`,
      submittedAt: now,
      submittedBy: this.currentPrincipal(),
    };
    const updated: ProposalDetail = { ...proposal, documents: [...proposal.documents, doc] };
    this.proposals.set(proposalId, updated);
    this.pushEvent(proposalId, {
      occurredAt: now,
      type: 'DOCUMENTS_SUBMITTED',
      triggeredBy: this.currentPrincipal(),
      note: null,
    });
    return of(doc);
  }

  requestDocuments(proposalId: string, request: ProposalNoteRequest): Observable<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    this.pushEvent(proposalId, {
      occurredAt: new Date().toISOString(),
      type: 'DOCUMENTS_REQUESTED',
      triggeredBy: this.currentPrincipal(),
      note: request.note || null,
    });
    return of(undefined);
  }

  listDocuments(proposalId: string): Observable<ProposalDocumentsResponse> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    return of({ proposalId, documents: proposal.documents });
  }

  downloadDocument(proposalId: string, documentId: string): Observable<Blob> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    return of(new Blob([`mock document content for ${documentId}`], { type: 'text/plain' }));
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
    const attachments = this.resolveMessageAttachments(proposal, request.documentIds ?? []);
    const msg: Message = {
      id: `msg-${this.nextId++}`,
      sentAt: new Date().toISOString(),
      sender: this.currentPrincipal().user.email,
      recipient: request.recipient,
      subject: request.subject,
      body: request.body,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const convMsgs = this.messages.get(proposal.conversationId) ?? [];
    convMsgs.push(msg);
    this.messages.set(proposal.conversationId, convMsgs);
    return of(msg);
  }

  private resolveMessageAttachments(
    proposal: ProposalDetail,
    documentIds: readonly string[],
  ): MessageAttachment[] {
    if (!documentIds.length) return [];

    const requested = new Set(documentIds);
    return proposal.documents
      .filter((document) => requested.has(document.id))
      .map((document) => ({
        documentId: document.id,
        fileName: document.fileName,
      }));
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
      triggeredBy: this.currentPrincipal(),
      note: request.note || null,
    };
    this.proposals.set(proposalId, { ...proposal, status: 'PENDING', assignedTo });
    this.projectState.syncProposalStatus(proposalId, 'PENDING', assignedTo, this.currentPrincipal());
    this.pushEvent(proposalId, evt);
    return of({ id: proposalId, status: 'PENDING', assignedTo, lastEvent: evt });
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
      triggeredBy: this.currentPrincipal(),
      note: request.note || null,
    };
    this.proposals.set(proposalId, { ...proposal, assignedTo });
    this.projectState.syncProposalStatus(proposalId, proposal.status, assignedTo, this.currentPrincipal());
    this.pushEvent(proposalId, evt);
    return of({ id: proposalId, status: proposal.status, assignedTo, lastEvent: evt });
  }

  referToDirection(
    proposalId: string,
    request: ReferToDirectionRequest,
  ): Observable<ProposalEventResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const evt: ProposalEvent = {
      occurredAt: new Date().toISOString(),
      type: 'REFERRED_TO_DIRECTION',
      triggeredBy: this.currentPrincipal(),
      note: request.note || request.question,
    };
    this.pushEvent(proposalId, evt);
    return of({ id: proposalId, status: proposal.status, lastEvent: evt });
  }

  directionClarification(
    proposalId: string,
    request: DirectionClarificationRequest,
  ): Observable<ProposalEventResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const evt: ProposalEvent = {
      occurredAt: new Date().toISOString(),
      type: 'DIRECTION_CLARIFIED',
      triggeredBy: this.currentPrincipal(),
      note: request.clarification || request.note || null,
    };
    this.pushEvent(proposalId, evt);
    return of({ id: proposalId, status: proposal.status, lastEvent: evt });
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

  approveProposal(
    proposalId: string,
    request: ApproveProposalRequest,
  ): Observable<ProposalDecisionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    const evt: ProposalEvent = {
      occurredAt: now,
      type: 'APPROVED',
      triggeredBy: this.currentPrincipal(),
      note: request.note || null,
    };
    const updated = { ...proposal, status: 'APPROVED' as const, collectionUseProject: { ...proposal.collectionUseProject, status: 'CREATED' as const } };
    this.proposals.set(proposalId, updated);
    this.projectState.acceptProjectForProposal(updated, now);
    this.pushEvent(proposalId, evt);
    return of({
      proposal: { id: proposalId, status: 'APPROVED', lastEvent: evt },
      collectionUseProject: { ...proposal.collectionUseProject, status: 'CREATED' },
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
      triggeredBy: this.currentPrincipal(),
      note: request.reason,
    };
    this.proposals.set(proposalId, {
      ...proposal,
      status: 'REJECTED',
      collectionUseProject: { ...proposal.collectionUseProject, status: 'CANCELLED' },
    });
    this.projectState.syncProposalStatus(proposalId, 'REJECTED', proposal.assignedTo, this.currentPrincipal());
    this.pushEvent(proposalId, evt);
    return of({
      proposal: { id: proposalId, status: 'REJECTED', lastEvent: evt },
      collectionUseProject: { ...proposal.collectionUseProject, status: 'CANCELLED' },
    });
  }

  private pushEvent(proposalId: string, evt: ProposalEvent): void {
    const evts = this.events.get(proposalId) ?? [];
    evts.push(evt);
    this.events.set(proposalId, evts);
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
      user: { id: user.id, name: user.name, email: user.email },
      group: permission.group.name,
    };
  }
}
