import { inject, Injectable } from '@angular/core';
import { Page } from 'src/app/shared/models/page.model';
import { Observable, of, throwError } from 'rxjs';

import { MediaType, UseResult, UseStatus } from 'src/app/shared/models/collection-use-status.model';
import {
  Attachment,
  CollectionUseProjectDetail,
  CollectionUseProjectSummary,
  CreateProjectEntryRequest,
  NoteRequest,
  ProjectEntriesPage,
  ProjectEntriesQuery,
  ProjectEntry,
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
} from 'src/app/features/collections/proposals/mocks/mock-data';

@Injectable()
export class ProjectApiServiceMock {
  private readonly state = inject(MockProjectState);

  listProjects(query: ProjectListQuery = {}): Observable<Page<CollectionUseProjectSummary>> {
    let items = [...this.state.projects.values()];

    if (query.status) items = items.filter((p) => p.status === query.status);
    if (query.type) items = items.filter((p) => p.type === query.type);
    if (query.result) items = items.filter((p) => p.result === query.result);
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
    return this.transition(projectId, ['ACCEPTED'], 'IN_PROGRESS', null, 'STARTED', request.note);
  }

  suspendProject(projectId: string, request: ReasonRequest): Observable<ProjectTransitionResult> {
    return this.transition(
      projectId,
      ['IN_PROGRESS'],
      'SUSPENDED',
      null,
      'SUSPENDED',
      request.reason,
    );
  }

  resumeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, ['SUSPENDED'], 'IN_PROGRESS', null, 'RESUMED', request.note);
  }

  completeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(
      projectId,
      ['IN_PROGRESS'],
      'COMPLETED',
      'COMPLETED',
      'COMPLETED',
      request.note,
    );
  }

  cancelProject(projectId: string, request: ReasonRequest): Observable<ProjectTransitionResult> {
    return this.transition(
      projectId,
      ['ACCEPTED', 'IN_PROGRESS', 'SUSPENDED'],
      'CANCELLED',
      'CANCELLED',
      'CANCELLED',
      request.reason,
    );
  }

  closeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, ['COMPLETED'], 'CLOSED', null, 'CLOSED', request.note);
  }

  createEntry(projectId: string, request: CreateProjectEntryRequest): Observable<ProjectEntry> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    if (p.status === 'CLOSED') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_PROJECT_STATUS',
        message: 'Entries cannot be added to a CLOSED project',
      }));
    }
    const entry: ProjectEntry = {
      id: this.state.nextEntryId(),
      content: request.content,
      addedAt: new Date().toISOString(),
      addedBy: P['alice'],
      attachments: [],
    };
    const current = this.state.entries.get(projectId) ?? [];
    current.push(entry);
    this.state.entries.set(projectId, current);
    p.entryTotal = current.length;
    p.entries = current;
    return of(entry);
  }

  listEntries(projectId: string, query: ProjectEntriesQuery = {}): Observable<ProjectEntriesPage> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    let items = this.state.entries.get(projectId) ?? [];
    if (query.addedBy) items = items.filter((e) => e.addedBy.permissionId === query.addedBy);
    if (query.group) items = items.filter((e) => e.addedBy.group === query.group);
    return of({ ...makePageFrom(items, query), projectId });
  }

  uploadAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    if (p.status === 'CLOSED') {
      return throwError(() => ({
        status: 409,
        error: 'INVALID_PROJECT_STATUS',
        message: 'Attachments cannot be added to a CLOSED project',
      }));
    }
    const allEntries = this.state.entries.get(projectId) ?? [];
    const entry = allEntries.find((e) => e.id === entryId);
    if (!entry) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const attachment: Attachment = {
      fileReference: this.state.nextFileReference(),
      fileName: file.name,
      mediaType,
      uploadedAt: new Date().toISOString(),
    };
    const updatedEntry: ProjectEntry = {
      ...entry,
      attachments: [...entry.attachments, attachment],
    };
    const idx = allEntries.findIndex((e) => e.id === entryId);
    allEntries[idx] = updatedEntry;
    this.state.entries.set(projectId, allEntries);
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
      result: p.result,
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
    const latest = p.entries.length > 0 ? p.entries[p.entries.length - 1] : null;
    return {
      ...this.toSummary(p),
      entries: { total: p.entryTotal, latest },
    };
  }

  private transition(
    projectId: string,
    allowedStatuses: readonly UseStatus[],
    newStatus: UseStatus,
    newResult: UseResult | null,
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
    if (newResult) p.result = newResult;
    const evt: UseEvent = {
      occurredAt: now,
      type: eventType,
      triggeredBy: P['alice'],
      note: note || null,
    };
    const events = this.state.events.get(projectId) ?? [];
    events.push(evt);
    this.state.events.set(projectId, events);
    return of({
      id: projectId,
      referenceNumber: p.referenceNumber,
      status: newStatus,
      result: newResult ?? undefined,
      lastEvent: evt,
    });
  }
}
