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
  CompleteProjectRequest,
  CreateProjectEntryRequest,
  NoteRequest,
  ProjectEntriesPage,
  ProjectEntriesQuery,
  ProjectEventsPage,
  ProjectEventsQuery,
  ProjectEntry,
  ProjectListQuery,
  ReasonRequest,
  UseEvent,
} from '../models/project.model';
import { MediaType, UseResult, UseStatus } from '@shared/models/collection-use-status.model';

export interface ProjectTransitionResult {
  readonly id: string;
  readonly referenceNumber: string;
  readonly status: UseStatus;
  readonly result?: UseResult;
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
    return this.http.get<CollectionUseProjectDetail>(this.url(`/collection-use-projects/${projectId}`));
  }

  startProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.http.post<ProjectTransitionResult>(
      this.url(`/collection-use-projects/${projectId}/start`),
      request,
    );
  }

  suspendProject(projectId: string, request: ReasonRequest): Observable<ProjectTransitionResult> {
    return this.http.post<ProjectTransitionResult>(
      this.url(`/collection-use-projects/${projectId}/suspend`),
      request,
    );
  }

  resumeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.http.post<ProjectTransitionResult>(
      this.url(`/collection-use-projects/${projectId}/resume`),
      request,
    );
  }

  completeProject(
    projectId: string,
    request: CompleteProjectRequest,
  ): Observable<ProjectTransitionResult> {
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

  closeProject(projectId: string, request: NoteRequest): Observable<ProjectTransitionResult> {
    return this.http.post<ProjectTransitionResult>(
      this.url(`/collection-use-projects/${projectId}/close`),
      request,
    );
  }

  createEntry(projectId: string, request: CreateProjectEntryRequest): Observable<ProjectEntry> {
    return this.http.post<ProjectEntry>(this.url(`/collection-use-projects/${projectId}/entries`), request);
  }

  listEntries(projectId: string, query: ProjectEntriesQuery = {}): Observable<ProjectEntriesPage> {
    return this.http.get<ProjectEntriesPage>(this.url(`/collection-use-projects/${projectId}/entries`), {
      params: buildHttpParams(query),
    });
  }

  uploadAttachment(
    projectId: string,
    entryId: string,
    file: File,
    mediaType: MediaType,
  ): Observable<Attachment> {
    const body = new FormData();
    body.append('file', file);
    body.append('mediaType', mediaType);

    return this.http.post<Attachment>(
      this.url(`/collection-use-projects/${projectId}/entries/${entryId}/attachments`),
      body,
    );
  }

  listEvents(projectId: string, query: ProjectEventsQuery = {}): Observable<ProjectEventsPage> {
    return this.http.get<ProjectEventsPage>(this.url(`/collection-use-projects/${projectId}/events`), {
      params: buildHttpParams(query),
    });
  }

  private url(path: string): string {
    return buildApiUrl(this.apiBaseUrl, path);
  }
}
