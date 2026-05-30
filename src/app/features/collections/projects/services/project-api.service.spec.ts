import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from 'src/app/core/config/app-config.model';

import { ProjectApiService } from './project-api.service';

describe('ProjectApiService', () => {
  let service: ProjectApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
        ProjectApiService,
      ],
    });

    service = TestBed.inject(ProjectApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists projects with staff filters', () => {
    service
      .listProjects({
        status: 'IN_PROGRESS',
        type: 'RESEARCH',
        result: 'COMPLETED',
        requestedBy: 'user-1',
        assignedTo: 'permission-1',
        referenceNumber: 'CUP-2026-0001',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
        search: 'specimen',
        page: 3,
        size: 15,
      })
      .subscribe();

    const request = http.expectOne(
      'https://api.example.test/collection-use-projects?status=IN_PROGRESS&type=RESEARCH&result=COMPLETED&requestedBy=user-1&assignedTo=permission-1&referenceNumber=CUP-2026-0001&dateFrom=2026-06-01&dateTo=2026-06-30&search=specimen&page=3&size=15',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('referenceNumber')).toBe('CUP-2026-0001');
    request.flush({ content: [], page: 3, size: 15, totalElements: 0, totalPages: 0 });
  });

  it('creates entries and closes projects with typed bodies', () => {
    service.createEntry('project-1', { content: 'Entry note' }).subscribe();

    const entryRequest = http.expectOne('https://api.example.test/collection-use-projects/project-1/entries');

    expect(entryRequest.request.method).toBe('POST');
    expect(entryRequest.request.body).toEqual({ content: 'Entry note' });
    entryRequest.flush({
      id: 'entry-1',
      content: 'Entry note',
      addedAt: '2026-06-01T10:00:00',
      addedBy: {
        permissionId: 'permission-1',
        user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
        group: 'CURATORIAL',
      },
      attachments: [],
    });

    service.closeProject('project-1', { note: 'Closed' }).subscribe();

    const closeRequest = http.expectOne('https://api.example.test/collection-use-projects/project-1/close');

    expect(closeRequest.request.method).toBe('POST');
    expect(closeRequest.request.body).toEqual({ note: 'Closed' });
    closeRequest.flush({
      id: 'project-1',
      referenceNumber: 'CUP-2026-0001',
      status: 'CLOSED',
      result: 'COMPLETED',
      lastEvent: {
        occurredAt: '2026-07-15T10:00:00',
        type: 'CLOSED',
        triggeredBy: {
          permissionId: 'permission-1',
          user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
          group: 'COLLECTIONS_MANAGEMENT',
        },
        note: 'Closed',
      },
    });
  });

  it('uploads project attachments as multipart form data', () => {
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });

    service.uploadAttachment('project-1', 'entry-1', file, 'IMAGE').subscribe();

    const request = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/entries/entry-1/attachments',
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBe(true);
    expect((request.request.body as FormData).get('file')).toBe(file);
    expect((request.request.body as FormData).get('mediaType')).toBe('IMAGE');
    request.flush({
      fileReference: 'files/photo',
      fileName: 'photo.jpg',
      mediaType: 'IMAGE',
      uploadedAt: '2026-06-01T10:00:00',
    });
  });
});
