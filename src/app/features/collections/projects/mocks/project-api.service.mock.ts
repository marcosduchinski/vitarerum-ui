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
      items = items.filter((p) => p.referenceNumber.toLowerCase().includes(q));
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
    return this.transition(projectId, 'IN_PROGRESS', null, 'STARTED', request.note);
  }

  suspendProject(projectId: string, request: ReasonRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, 'SUSPENDED', null, 'SUSPENDED', request.reason);
  }

  resumeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, 'IN_PROGRESS', null, 'RESUMED', request.note);
  }

  completeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, 'COMPLETED', 'COMPLETED', 'COMPLETED', request.note);
  }

  cancelProject(projectId: string, request: ReasonRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, 'CANCELLED', 'CANCELLED', 'CANCELLED', request.reason);
  }

  closeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, 'CLOSED', null, 'CLOSED', request.note);
  }

  createEntry(projectId: string, request: CreateProjectEntryRequest): Observable<ProjectEntry> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
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
    return of({ ...makePageFrom(items, query), projectId });
  }

  uploadAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
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
    const evts = this.state.events.get(projectId) ?? [];
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
    newStatus: UseStatus,
    newResult: UseResult | null,
    eventType: UseEvent['type'],
    note: string,
  ): Observable<ProjectTransitionResult> {
    const p = this.state.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
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
