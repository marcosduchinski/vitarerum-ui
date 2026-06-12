import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { API_BASE_URL } from '@core/config/app-config.model';
import { buildApiUrl } from '@core/http/api-url.util';
import { buildHttpParams } from '@core/http/http-params.util';
import { Page } from '@shared/models/page.model';
import { Observable } from 'rxjs';

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
  ProjectEventsPage,
  ProjectEventsQuery,
  ProjectListQuery,
  ReasonRequest,
  UseEvent,
} from '../models/project.model';
import { MediaType, UseResult, UseStatus } from '@shared/models/collection-use-status.model';

export interface ProjectTransitionResult {
  readonly id: string;
  readonly referenceNumber: string;
  readonly status: UseStatus;
  readonly result: UseResult | null;
  readonly lastEvent: UseEvent;
}

export const PROJECT_API_SERVICE = new InjectionToken<ProjectApiService>('PROJECT_API_SERVICE');

@Injectable()
export class ProjectApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  listProjects(query: ProjectListQuery = {}): Observable<Page<CollectionUseProjectSummary>> {
    return this.http.get<Page<CollectionUseProjectSummary>>(this.url('/collection-use-projects'), {
      params: buildHttpParams(query),
    });
  }

  getProject(projectId: string): Observable<CollectionUseProjectDetail> {
    return this.http.get<CollectionUseProjectDetail>(
      this.url(`/collection-use-projects/${projectId}`),
    );
  }

  startProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.http.post<ProjectTransitionResult>(
      this.url(`/collection-use-projects/${projectId}/start`),
      request,
    );
  }

  completeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.http.post<ProjectTransitionResult>(
      this.url(`/collection-use-projects/${projectId}/complete`),
      request,
    );
  }

  cancelProject(projectId: string, request: ReasonRequest): Observable<ProjectTransitionResult> {
    return this.http.post<ProjectTransitionResult>(
      this.url(`/collection-use-projects/${projectId}/cancel`),
      request,
    );
  }

  createObjectLogEntry(
    projectId: string,
    request: CreateObjectLogEntryRequest,
  ): Observable<ObjectLogEntry> {
    return this.http.post<ObjectLogEntry>(
      this.url(`/collection-use-projects/${projectId}/log-entries`),
      request,
    );
  }

  listObjectLogEntries(
    projectId: string,
    query: ObjectLogEntriesQuery = {},
  ): Observable<ObjectLogEntriesPage> {
    return this.http.get<ObjectLogEntriesPage>(
      this.url(`/collection-use-projects/${projectId}/log-entries`),
      { params: buildHttpParams(query) },
    );
  }

  getObjectAccessLog(projectId: string): Observable<ObjectAccessLog> {
    return this.http.get<ObjectAccessLog>(
      this.url(`/collection-use-projects/${projectId}/object-access-log`),
    );
  }

  concludeObjectAccessLog(projectId: string): Observable<ObjectAccessLog> {
    return this.http.post<ObjectAccessLog>(
      this.url(`/collection-use-projects/${projectId}/object-access-log/conclusion`),
      {},
    );
  }

  uploadLogEntryAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
    const body = new FormData();
    body.append('file', file);
    body.append('mediaType', mediaType);

    return this.http.post<Attachment>(
      this.url(`/collection-use-projects/${projectId}/log-entries/${entryId}/attachments`),
      body,
    );
  }

  createObjectOccurrenceEntry(
    projectId: string,
    request: CreateObjectOccurrenceEntryRequest,
  ): Observable<ObjectOccurrenceEntry> {
    return this.http.post<ObjectOccurrenceEntry>(
      this.url(`/collection-use-projects/${projectId}/occurrence-entries`),
      request,
    );
  }

  listObjectOccurrenceEntries(
    projectId: string,
    query: ObjectOccurrenceEntriesQuery = {},
  ): Observable<ObjectOccurrenceEntriesPage> {
    return this.http.get<ObjectOccurrenceEntriesPage>(
      this.url(`/collection-use-projects/${projectId}/occurrence-entries`),
      { params: buildHttpParams(query) },
    );
  }

  uploadOccurrenceEntryAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
    const body = new FormData();
    body.append('file', file);
    body.append('mediaType', mediaType);

    return this.http.post<Attachment>(
      this.url(`/collection-use-projects/${projectId}/occurrence-entries/${entryId}/attachments`),
      body,
    );
  }

  listEvents(projectId: string, query: ProjectEventsQuery = {}): Observable<ProjectEventsPage> {
    return this.http.get<ProjectEventsPage>(
      this.url(`/collection-use-projects/${projectId}/events`),
      {
        params: buildHttpParams(query),
      },
    );
  }

  private url(path: string): string {
    return buildApiUrl(this.apiBaseUrl, path);
  }
}
