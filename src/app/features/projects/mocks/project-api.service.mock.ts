import { Injectable } from '@angular/core';
import { Page } from '@shared/models/page.model';
import { Observable, of, throwError } from 'rxjs';

import { MediaType, UseResult, UseStatus } from '@shared/models/collection-use-status.model';
import {
  Attachment,
  CollectionUseProjectDetail,
  CollectionUseProjectSummary,
  CompleteProjectRequest,
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
  MutableProjectState,
  P,
  SEED_PROJECT_ENTRIES,
  SEED_PROJECT_EVENTS,
  SEED_PROJECTS,
} from '@features/proposals/mocks/mock-data';

@Injectable()
export class ProjectApiServiceMock {
  private readonly projects = new Map<string, MutableProjectState>(
    SEED_PROJECTS.map(p => [p.id, structuredClone(p)]),
  );
  private readonly entries = new Map<string, ProjectEntry[]>(
    Object.entries(SEED_PROJECT_ENTRIES).map(([k, v]) => [k, structuredClone(v)]),
  );
  private readonly events = new Map<string, UseEvent[]>(
    Object.entries(SEED_PROJECT_EVENTS).map(([k, v]) => [k, structuredClone(v)]),
  );
  private nextId = 200;

  listProjects(query: ProjectListQuery = {}): Observable<Page<CollectionUseProjectSummary>> {
    let items = [...this.projects.values()];

    if (query.status) items = items.filter(p => p.status === query.status);
    if (query.type) items = items.filter(p => p.type === query.type);
    if (query.result) items = items.filter(p => p.result === query.result);
    if (query.requestedBy) items = items.filter(p => p.requestedBy.permissionId === query.requestedBy);
    if (query.referenceNumber) {
      const q = query.referenceNumber.toLowerCase();
      items = items.filter(p => p.referenceNumber.toLowerCase().includes(q));
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter(p => p.title.toLowerCase().includes(q) || p.referenceNumber.toLowerCase().includes(q));
    }

    const summaries: CollectionUseProjectSummary[] = items.map(p => this.toSummary(p));
    return of(makePageFrom(summaries, query));
  }

  getProject(projectId: string): Observable<CollectionUseProjectDetail> {
    const p = this.projects.get(projectId);
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

  completeProject(projectId: string, request: CompleteProjectRequest): Observable<ProjectTransitionResult> {
    const finalStatus = request.result === 'COMPLETED' ? 'COMPLETED' : 'PARTIALLY_COMPLETED';
    return this.transition(projectId, finalStatus as UseStatus, request.result as UseResult, request.result, request.note);
  }

  cancelProject(projectId: string, request: ReasonRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, 'CANCELLED', 'CANCELLED', 'CANCELLED', request.reason);
  }

  closeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.transition(projectId, 'CLOSED', null, 'CLOSED', request.note);
  }

  createEntry(projectId: string, request: CreateProjectEntryRequest): Observable<ProjectEntry> {
    const p = this.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const entry: ProjectEntry = {
      id: `entry-${this.nextId++}`,
      content: request.content,
      addedAt: new Date().toISOString(),
      addedBy: P['alice'],
      attachments: [],
    };
    const current = this.entries.get(projectId) ?? [];
    current.push(entry);
    this.entries.set(projectId, current);
    p.entryTotal = current.length;
    p.entries = current;
    return of(entry);
  }

  listEntries(projectId: string, query: ProjectEntriesQuery = {}): Observable<ProjectEntriesPage> {
    const p = this.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    let items = this.entries.get(projectId) ?? [];
    if (query.addedBy) items = items.filter(e => e.addedBy.permissionId === query.addedBy);
    return of({ ...makePageFrom(items, query), projectId });
  }

  uploadAttachment(projectId: string, entryId: string, file: File, mediaType: MediaType): Observable<Attachment> {
    const allEntries = this.entries.get(projectId) ?? [];
    const entry = allEntries.find(e => e.id === entryId);
    if (!entry) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const attachment: Attachment = {
      fileReference: `mock-ref-${this.nextId++}`,
      fileName: file.name,
      mediaType,
      uploadedAt: new Date().toISOString(),
    };
    const updatedEntry: ProjectEntry = { ...entry, attachments: [...entry.attachments, attachment] };
    const idx = allEntries.findIndex(e => e.id === entryId);
    allEntries[idx] = updatedEntry;
    this.entries.set(projectId, allEntries);
    return of(attachment);
  }

  listEvents(projectId: string, query: ProjectEventsQuery = {}): Observable<ProjectEventsPage> {
    const evts = this.events.get(projectId) ?? [];
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
    const p = this.projects.get(projectId);
    if (!p) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    const now = new Date().toISOString();
    p.status = newStatus;
    if (newResult) p.result = newResult;
    const evt: UseEvent = { occurredAt: now, type: eventType, triggeredBy: P['alice'], note: note || null };
    (this.events.get(projectId) ?? []).push(evt);
    return of({ id: projectId, referenceNumber: p.referenceNumber, status: newStatus, result: newResult ?? undefined, lastEvent: evt });
  }
}
