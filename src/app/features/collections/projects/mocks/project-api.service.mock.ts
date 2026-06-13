import { inject, Injectable } from '@angular/core';
import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { Page } from '@shared/models/page.model';
import { Observable, of, throwError } from 'rxjs';

import { MediaType, UseResult, UseStatus } from '@shared/models/collection-use-status.model';
import {
  Attachment,
  CollectionUseProjectDetail,
  CollectionUseProjectSummary,
  CreateObjectLogEntryRequest,
  CreateObjectOccurrenceEntryRequest,
  NoteRequest,
  ObjectAccessLog,
  ObjectLogEntriesPage,
  ObjectLogEntriesQuery,
  ObjectLogEntry,
  ObjectOccurrenceEntriesPage,
  ObjectOccurrenceEntriesQuery,
  ObjectOccurrenceEntry,
  ObjectOccurrenceLog,
  ProjectEventsPage,
  ProjectEventsQuery,
  ProjectListQuery,
  ReasonRequest,
  UpdateObjectLogEntryRequest,
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
    const currentPrincipal = this.currentPrincipal();
    if (currentPrincipal.group === 'EXTERNAL' && p.status !== 'IN_PROGRESS') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Entries can only be added while the project is IN_PROGRESS',
      }));
    }
    const accessLog = this.ensureObjectAccessLog(projectId);
    if (accessLog.dateConclusion) {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Object access log is already concluded',
      }));
    }
    const entry: ObjectLogEntry = {
      id: this.state.nextEntryId(),
      objectReference: {
        inventoryNumber: request.inventoryNumber,
        displayTitle: null,
        objectName: null,
        briefDescriptionSnapshot: null,
      },
      numberOfObjects: request.numberOfObjects,
      addedAt: new Date().toISOString(),
      addedBy: currentPrincipal,
      observations: request.observations ?? null,
      requestedObjectId: request.requestedObjectId ?? null,
      attachments: [],
    };
    const current = this.state.logEntries.get(projectId) ?? [];
    current.push(entry);
    this.state.logEntries.set(projectId, current);
    return of(entry);
  }

  updateObjectLogEntry(
    projectId: string,
    entryId: string,
    request: UpdateObjectLogEntryRequest,
  ): Observable<ObjectLogEntry> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const accessLog = this.state.objectAccessLogs.get(projectId);
    if (accessLog?.dateConclusion) {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Cannot edit entries of a concluded object access log',
      }));
    }
    if (this.currentPrincipal().group === 'EXTERNAL' && p.status !== 'IN_PROGRESS') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Entries can only be edited while the project is IN_PROGRESS',
      }));
    }
    if (request.numberOfObjects !== undefined && request.numberOfObjects < 1) {
      return throwError(() => ({ status: 422, error: 'VALIDATION_ERROR' }));
    }

    const allEntries = this.state.logEntries.get(projectId) ?? [];
    const idx = allEntries.findIndex((e) => e.id === entryId);
    if (idx < 0) {
      return throwError(() => ({
        status: 404,
        error: 'ENTRY_NOT_FOUND',
        message: `No entry found with id ${entryId}`,
      }));
    }

    const current = allEntries[idx];
    const updated: ObjectLogEntry = {
      ...current,
      ...(request.addedAt !== undefined ? { addedAt: request.addedAt } : {}),
      ...(request.numberOfObjects !== undefined
        ? { numberOfObjects: request.numberOfObjects }
        : {}),
      ...(request.observations !== undefined ? { observations: request.observations } : {}),
    };
    allEntries[idx] = updated;
    this.state.logEntries.set(projectId, allEntries);
    return of(updated);
  }

  listObjectLogEntries(
    projectId: string,
    query: ObjectLogEntriesQuery = {},
  ): Observable<ObjectLogEntriesPage> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    let items = this.state.logEntries.get(projectId) ?? [];
    if (query.addedBy) items = items.filter((e) => e.addedBy.permissionId === query.addedBy);
    return of({
      ...makePageFrom(items, query),
      projectId,
      accessLog: this.state.objectAccessLogs.get(projectId) ?? null,
    });
  }

  getObjectAccessLog(projectId: string): Observable<ObjectAccessLog> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const accessLog = this.state.objectAccessLogs.get(projectId);
    if (!accessLog) {
      return throwError(() => ({
        status: 404,
        error: 'OBJECT_ACCESS_LOG_NOT_FOUND',
        message: 'No object_access_log found with id uuid',
      }));
    }
    return of(accessLog);
  }

  concludeObjectAccessLog(projectId: string): Observable<ObjectAccessLog> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const accessLog = this.state.objectAccessLogs.get(projectId);
    if (!accessLog) {
      return throwError(() => ({
        status: 404,
        error: 'OBJECT_ACCESS_LOG_NOT_FOUND',
        message: 'No object_access_log found with id uuid',
      }));
    }
    const currentPrincipal = this.currentPrincipal();
    if (
      currentPrincipal.group !== 'CURATORIAL' &&
      currentPrincipal.group !== 'COLLECTIONS_MANAGEMENT'
    ) {
      return throwError(() => ({ status: 403, error: 'FORBIDDEN' }));
    }
    if (accessLog.dateConclusion) {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Object access log is already concluded',
      }));
    }
    const concluded: ObjectAccessLog = {
      ...accessLog,
      dateConclusion: new Date().toISOString(),
      curator: currentPrincipal,
    };
    this.state.objectAccessLogs.set(projectId, concluded);
    return of(concluded);
  }

  uploadLogEntryAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const accessLog = this.state.objectAccessLogs.get(projectId);
    if (accessLog?.dateConclusion) {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Object access log is already concluded',
      }));
    }
    if (this.currentPrincipal().group === 'EXTERNAL' && p.status !== 'IN_PROGRESS') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Entries can only be added while the project is IN_PROGRESS',
      }));
    }
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
    const currentPrincipal = this.currentPrincipal();
    if (currentPrincipal.group === 'EXTERNAL' && p.status !== 'IN_PROGRESS') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Entries can only be added while the project is IN_PROGRESS',
      }));
    }
    const occurrenceLog = this.ensureObjectOccurrenceLog(projectId);
    if (occurrenceLog.dateConclusion) {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Object occurrence log is already concluded',
      }));
    }
    const entry: ObjectOccurrenceEntry = {
      id: this.state.nextEntryId(),
      objectReference: {
        inventoryNumber: request.inventoryNumber,
        displayTitle: null,
        objectName: null,
        briefDescriptionSnapshot: null,
      },
      numberOfObjects: request.numberOfObjects,
      occurrenceDate: request.occurrenceDate,
      location: request.location,
      reportedBy: currentPrincipal,
      detailedDescription: request.detailedDescription,
      testimonial: request.testimonial ?? null,
      requestedObjectId: request.requestedObjectId ?? null,
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
    if (query.reportedBy) {
      items = items.filter((e) => e.reportedBy.permissionId === query.reportedBy);
    }
    return of({
      ...makePageFrom(items, query),
      projectId,
      occurrenceLog: this.state.objectOccurrenceLogs.get(projectId) ?? null,
    });
  }

  getObjectOccurrenceLog(projectId: string): Observable<ObjectOccurrenceLog> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const occurrenceLog = this.state.objectOccurrenceLogs.get(projectId);
    if (!occurrenceLog) {
      return throwError(() => ({
        status: 404,
        error: 'OBJECT_OCCURRENCE_LOG_NOT_FOUND',
        message: 'No object_occurrence_log found with id uuid',
      }));
    }
    return of(occurrenceLog);
  }

  concludeObjectOccurrenceLog(projectId: string): Observable<ObjectOccurrenceLog> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const occurrenceLog = this.state.objectOccurrenceLogs.get(projectId);
    if (!occurrenceLog) {
      return throwError(() => ({
        status: 404,
        error: 'OBJECT_OCCURRENCE_LOG_NOT_FOUND',
        message: 'No object_occurrence_log found with id uuid',
      }));
    }
    const currentPrincipal = this.currentPrincipal();
    if (
      currentPrincipal.group !== 'CURATORIAL' &&
      currentPrincipal.group !== 'COLLECTIONS_MANAGEMENT'
    ) {
      return throwError(() => ({ status: 403, error: 'FORBIDDEN' }));
    }
    if (occurrenceLog.dateConclusion) {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Object occurrence log is already concluded',
      }));
    }
    const concluded: ObjectOccurrenceLog = {
      ...occurrenceLog,
      dateConclusion: new Date().toISOString(),
      curator: currentPrincipal,
    };
    this.state.objectOccurrenceLogs.set(projectId, concluded);
    return of(concluded);
  }

  uploadOccurrenceEntryAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const occurrenceLog = this.state.objectOccurrenceLogs.get(projectId);
    if (occurrenceLog?.dateConclusion) {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Object occurrence log is already concluded',
      }));
    }
    if (this.currentPrincipal().group === 'EXTERNAL' && p.status !== 'IN_PROGRESS') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_TRANSITION',
        message: 'Entries can only be added while the project is IN_PROGRESS',
      }));
    }
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
      note: p.note ?? null,
      type: p.type,
      status: p.status,
      result: p.result ?? null,
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
    const result: UseResult | null =
      newStatus === 'COMPLETED' ? 'COMPLETED' : newStatus === 'CANCELLED' ? 'CANCELLED' : null;
    p.result = result;
    const evt: UseEvent = {
      occurredAt: now,
      type: eventType,
      triggeredBy: this.currentPrincipal(),
      note: note || null,
    };
    const events = this.state.events.get(projectId) ?? [];
    events.push(evt);
    this.state.events.set(projectId, events);
    return of({
      id: projectId,
      referenceNumber: p.referenceNumber,
      status: newStatus,
      result,
      lastEvent: evt,
    });
  }

  private currentPrincipal() {
    const session = this.identity.session();
    return session
      ? (Object.values(P).find(
          (p) => p.user.id === session.user.id || p.user.email === session.user.email,
        ) ?? P['alice'])
      : P['alice'];
  }

  private ensureObjectAccessLog(projectId: string): ObjectAccessLog {
    const current = this.state.objectAccessLogs.get(projectId);
    if (current) return current;
    const accessLog: ObjectAccessLog = {
      id: this.state.nextObjectAccessLogId(),
      referenceNumber: this.state.nextObjectAccessLogReference(),
      projectId,
      dateConclusion: null,
      curator: null,
    };
    this.state.objectAccessLogs.set(projectId, accessLog);
    return accessLog;
  }

  private ensureObjectOccurrenceLog(projectId: string): ObjectOccurrenceLog {
    const current = this.state.objectOccurrenceLogs.get(projectId);
    if (current) return current;
    const occurrenceLog: ObjectOccurrenceLog = {
      id: this.state.nextObjectOccurrenceLogId(),
      referenceNumber: this.state.nextObjectOccurrenceLogReference(),
      projectId,
      dateConclusion: null,
      curator: null,
    };
    this.state.objectOccurrenceLogs.set(projectId, occurrenceLog);
    return occurrenceLog;
  }
}
