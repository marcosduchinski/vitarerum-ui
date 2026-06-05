import { inject, Injectable } from '@angular/core';
import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { Page } from '@shared/models/page.model';
import { Observable, of, throwError } from 'rxjs';

import { MediaType, UseStatus } from '@shared/models/collection-use-status.model';
import {
  Attachment,
  CollectionUseProjectDetail,
  CollectionUseProjectSummary,
  CreateObjectLogEntryRequest,
  CreateObjectOccurrenceEntryRequest,
  NoteRequest,
  ObjectLogEntriesPage,
  ObjectLogEntriesQuery,
  ObjectLogEntry,
  ObjectOccurrenceEntriesPage,
  ObjectOccurrenceEntriesQuery,
  ObjectOccurrenceEntry,
  ProjectEventsPage,
  ProjectEventsQuery,
  ProjectListQuery,
  ReasonRequest,
  UseEvent,
} from '../models/project.model';
import { ProjectTransitionResult } from '../services/project-api.service';
import {
  makePageFrom,
  MockProjectState,
  MutableProjectState,
  P,
} from '@features/collections/proposals/mocks/mock-data';

@Injectable()
export class ProjectApiServiceMock {
  private readonly state = inject(MockProjectState);
  private readonly identity = inject(IDENTITY_SERVICE);

  listProjects(query: ProjectListQuery = {}): Observable<Page<CollectionUseProjectSummary>> {
    let items = [...this.state.projects.values()];

    if (query.status) items = items.filter((p) => p.status === query.status);
    if (query.type) items = items.filter((p) => p.type === query.type);
    if (query.requestedBy)
      items = items.filter((p) => p.requestedBy.permissionId === query.requestedBy);
    if (query.assignedTo)
      items = items.filter((p) => p.proposalAssignedTo?.permissionId === query.assignedTo);
    if (query.referenceNumber) {
      const q = query.referenceNumber.toLowerCase();
      items = items.filter((p) => p.referenceNumber.toLowerCase() === q);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter(
        (p) => p.title.toLowerCase().includes(q) || p.referenceNumber.toLowerCase().includes(q),
      );
    }

    const summaries: CollectionUseProjectSummary[] = items.map((p) => this.toSummary(p));
    return of(makePageFrom(summaries, query));
  }

  getProject(projectId: string): Observable<CollectionUseProjectDetail> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    return of(this.toDetail(p));
  }

  startProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, ['CREATED'], 'IN_PROGRESS', 'STARTED', request.note);
  }

  completeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, ['IN_PROGRESS'], 'COMPLETED', 'COMPLETED', request.note);
  }

  cancelProject(projectId: string, request: ReasonRequest): Observable<ProjectTransitionResult> {
    return this.transition(
      projectId,
      ['CREATED', 'IN_PROGRESS'],
      'CANCELLED',
      'CANCELLED',
      request.reason,
    );
  }

  createObjectLogEntry(
    projectId: string,
    request: CreateObjectLogEntryRequest,
  ): Observable<ObjectLogEntry> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    if (p.status === 'COMPLETED' || p.status === 'CANCELLED') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_PROJECT_STATUS',
        message: 'Entries cannot be added to a completed or cancelled project',
      }));
    }
    const entry: ObjectLogEntry = {
      id: this.state.nextEntryId(),
      collectionUseProjectId: projectId,
      content: request.content,
      addedAt: new Date().toISOString(),
      addedBy: this.currentPermissionId(),
      objects:
        request.objects?.map((inv) => ({
          inventoryNumber: inv,
          displayTitle: null,
          objectName: null,
          briefDescriptionSnapshot: null,
        })) ?? [],
      attachments: [],
    };
    const current = this.state.logEntries.get(projectId) ?? [];
    current.push(entry);
    this.state.logEntries.set(projectId, current);
    return of(entry);
  }

  listObjectLogEntries(
    projectId: string,
    query: ObjectLogEntriesQuery = {},
  ): Observable<ObjectLogEntriesPage> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    let items = this.state.logEntries.get(projectId) ?? [];
    if (query.addedBy) items = items.filter((e) => e.addedBy === query.addedBy);
    return of({ ...makePageFrom(items, query), projectId });
  }

  uploadLogEntryAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const allEntries = this.state.logEntries.get(projectId) ?? [];
    const entry = allEntries.find((e) => e.id === entryId);
    if (!entry) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const attachment: Attachment = {
      fileReference: this.state.nextFileReference(),
      fileName: file.name,
      mediaType,
      uploadedAt: new Date().toISOString(),
    };
    const idx = allEntries.findIndex((e) => e.id === entryId);
    allEntries[idx] = { ...entry, attachments: [...entry.attachments, attachment] };
    this.state.logEntries.set(projectId, allEntries);
    return of(attachment);
  }

  createObjectOccurrenceEntry(
    projectId: string,
    request: CreateObjectOccurrenceEntryRequest,
  ): Observable<ObjectOccurrenceEntry> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    if (p.status === 'COMPLETED' || p.status === 'CANCELLED') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_PROJECT_STATUS',
        message: 'Entries cannot be added to a completed or cancelled project',
      }));
    }
    const entry: ObjectOccurrenceEntry = {
      id: this.state.nextEntryId(),
      collectionUseProjectId: projectId,
      content: request.content,
      addedAt: new Date().toISOString(),
      addedBy: this.currentPermissionId(),
      objects:
        request.objects?.map((inv) => ({
          inventoryNumber: inv,
          displayTitle: null,
          objectName: null,
          briefDescriptionSnapshot: null,
        })) ?? [],
      attachments: [],
    };
    const current = this.state.occurrenceEntries.get(projectId) ?? [];
    current.push(entry);
    this.state.occurrenceEntries.set(projectId, current);
    return of(entry);
  }

  listObjectOccurrenceEntries(
    projectId: string,
    query: ObjectOccurrenceEntriesQuery = {},
  ): Observable<ObjectOccurrenceEntriesPage> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    let items = this.state.occurrenceEntries.get(projectId) ?? [];
    if (query.addedBy) items = items.filter((e) => e.addedBy === query.addedBy);
    return of({ ...makePageFrom(items, query), projectId });
  }

  uploadOccurrenceEntryAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const allEntries = this.state.occurrenceEntries.get(projectId) ?? [];
    const entry = allEntries.find((e) => e.id === entryId);
    if (!entry) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const attachment: Attachment = {
      fileReference: this.state.nextFileReference(),
      fileName: file.name,
      mediaType,
      uploadedAt: new Date().toISOString(),
    };
    const idx = allEntries.findIndex((e) => e.id === entryId);
    allEntries[idx] = { ...entry, attachments: [...entry.attachments, attachment] };
    this.state.occurrenceEntries.set(projectId, allEntries);
    return of(attachment);
  }

  listEvents(projectId: string, query: ProjectEventsQuery = {}): Observable<ProjectEventsPage> {
    let evts = this.state.events.get(projectId) ?? [];
    if (query.type) evts = evts.filter((e) => e.type === query.type);
    return of({ ...makePageFrom(evts, query), projectId });
  }

  private toSummary(p: MutableProjectState): CollectionUseProjectSummary {
    return {
      id: p.id,
      referenceNumber: p.referenceNumber,
      title: p.title,
      purpose: p.purpose,
      type: p.type,
      status: p.status,
      beginDate: p.beginDate,
      endDate: p.endDate,
      requestedBy: p.requestedBy,
      proposal: {
        id: p.proposalId,
        status: p.proposalStatus,
        assignedTo: p.proposalAssignedTo,
      },
    };
  }

  private toDetail(p: MutableProjectState): CollectionUseProjectDetail {
    return this.toSummary(p);
  }

  private transition(
    projectId: string,
    allowedStatuses: readonly UseStatus[],
    newStatus: UseStatus,
    eventType: UseEvent['type'],
    note: string,
  ): Observable<ProjectTransitionResult> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    if (!allowedStatuses.includes(p.status)) {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: `Project must be ${allowedStatuses.join(' or ')} to transition to ${newStatus}`,
      }));
    }
    const now = new Date().toISOString();
    p.status = newStatus;
    const evt: UseEvent = {
      occurredAt: now,
      type: eventType,
      triggeredBy: this.currentPrincipal(),
      note: note || null,
    };
    const events = this.state.events.get(projectId) ?? [];
    events.push(evt);
    this.state.events.set(projectId, events);
    return of({ id: projectId, referenceNumber: p.referenceNumber, status: newStatus, lastEvent: evt });
  }

  private currentPermissionId(): string {
    const session = this.identity.session();
    return session
      ? (Object.values(P).find(
          (p) => p.user.id === session.user.id || p.user.email === session.user.email,
        )?.permissionId ?? P['alice'].permissionId)
      : P['alice'].permissionId;
  }

  private currentPrincipal() {
    const session = this.identity.session();
    return session
      ? (Object.values(P).find(
          (p) => p.user.id === session.user.id || p.user.email === session.user.email,
        ) ?? P['alice'])
      : P['alice'];
  }
}
