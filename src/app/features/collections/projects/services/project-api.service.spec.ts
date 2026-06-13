import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@core/config/app-config.model';

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

  it('lists projects with implemented server filters only', () => {
    service
      .listProjects({
        status: 'IN_PROGRESS',
        type: 'RESEARCH',
        requestedBy: 'user-1',
        assignedTo: 'permission-1',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
        search: 'specimen',
        page: 3,
        size: 15,
      })
      .subscribe();

    const request = http.expectOne(
      'https://api.example.test/collection-use-projects?status=IN_PROGRESS&type=RESEARCH&dateFrom=2026-06-01&dateTo=2026-06-30&search=specimen&page=3&size=15',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('requestedBy')).toBe(false);
    expect(request.request.params.has('assignedTo')).toBe(false);
    request.flush({ content: [], page: 3, size: 15, totalElements: 0, totalPages: 0 });
  });

  it('creates object log entries and completes projects', () => {
    service
      .createObjectLogEntry('project-1', {
        inventoryNumber: 'INV-001',
        numberOfObjects: 2,
        observations: 'Handled during reading room access.',
      })
      .subscribe();

    const entryRequest = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/log-entries',
    );

    expect(entryRequest.request.method).toBe('POST');
    expect(entryRequest.request.body).toEqual({
      inventoryNumber: 'INV-001',
      numberOfObjects: 2,
      observations: 'Handled during reading room access.',
    });
    entryRequest.flush({
      id: 'entry-1',
      objectReference: {
        inventoryNumber: 'INV-001',
        displayTitle: null,
        objectName: null,
        briefDescriptionSnapshot: null,
      },
      numberOfObjects: 2,
      addedAt: '2026-06-01T10:00:00',
      addedBy: {
        permissionId: 'permission-1',
        user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
        group: 'COLLECTIONS_MANAGEMENT',
      },
      observations: 'Handled during reading room access.',
      attachments: [],
    });

    service.completeProject('project-1', { note: 'Completed' }).subscribe();

    const completeRequest = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/complete',
    );

    expect(completeRequest.request.method).toBe('POST');
    expect(completeRequest.request.body).toEqual({ note: 'Completed' });
    completeRequest.flush({
      id: 'project-1',
      referenceNumber: 'CUP-2026-0001',
      status: 'COMPLETED',
      lastEvent: {
        occurredAt: '2026-07-15T10:00:00',
        type: 'COMPLETED',
        triggeredBy: {
          permissionId: 'permission-1',
          user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
          group: 'COLLECTIONS_MANAGEMENT',
        },
        note: 'Completed',
      },
    });
  });

  it('lists object log entries with filters and access log metadata', () => {
    service
      .listObjectLogEntries('project-1', { addedBy: 'permission-1', page: 1, size: 10 })
      .subscribe();

    const request = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/log-entries?addedBy=permission-1&page=1&size=10',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('addedBy')).toBe('permission-1');
    request.flush({
      projectId: 'project-1',
      accessLog: {
        id: 'access-log-1',
        referenceNumber: 'OAL-1A2B3C4D',
        projectId: 'project-1',
        dateConclusion: null,
        curator: null,
      },
      content: [],
      page: 1,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    });
  });

  it('updates object log entries with the editable fields', () => {
    service
      .updateObjectLogEntry('project-1', 'entry-1', {
        addedAt: '2026-06-02T14:30:00Z',
        numberOfObjects: 3,
        observations: null,
      })
      .subscribe();

    const request = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/log-entries/entry-1',
    );

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      addedAt: '2026-06-02T14:30:00Z',
      numberOfObjects: 3,
      observations: null,
    });
    request.flush({
      id: 'entry-1',
      objectReference: {
        inventoryNumber: 'INV-001',
        displayTitle: null,
        objectName: null,
        briefDescriptionSnapshot: null,
      },
      numberOfObjects: 3,
      addedAt: '2026-06-02T14:30:00Z',
      addedBy: {
        permissionId: 'permission-1',
        user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
        group: 'COLLECTIONS_MANAGEMENT',
      },
      observations: null,
      requestedObjectId: null,
      attachments: [],
    });
  });

  it('gets and concludes object access logs', () => {
    service.getObjectAccessLog('project-1').subscribe();

    const getRequest = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/object-access-log',
    );

    expect(getRequest.request.method).toBe('GET');
    getRequest.flush({
      id: 'access-log-1',
      referenceNumber: 'OAL-1A2B3C4D',
      projectId: 'project-1',
      dateConclusion: null,
      curator: null,
    });

    service.concludeObjectAccessLog('project-1').subscribe();

    const concludeRequest = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/object-access-log/conclusion',
    );

    expect(concludeRequest.request.method).toBe('POST');
    expect(concludeRequest.request.body).toEqual({});
    concludeRequest.flush({
      id: 'access-log-1',
      referenceNumber: 'OAL-1A2B3C4D',
      projectId: 'project-1',
      dateConclusion: '2026-06-04T16:00:00',
      curator: {
        permissionId: 'permission-1',
        user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
        group: 'COLLECTIONS_MANAGEMENT',
      },
    });
  });

  it('uploads log entry attachments as multipart form data', () => {
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });

    service.uploadLogEntryAttachment('project-1', 'entry-1', file, 'IMAGE').subscribe();

    const request = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/log-entries/entry-1/attachments',
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

  it('creates object occurrence entries with the revised contract payload', () => {
    service
      .createObjectOccurrenceEntry('project-1', {
        inventoryNumber: 'INV-001',
        numberOfObjects: 1,
        occurrenceDate: '2026-06-03T11:30:00',
        location: 'Conservation lab, room 2',
        detailedDescription: 'Surface abrasion reported during handling.',
        testimonial: 'Observed by the researcher.',
      })
      .subscribe();

    const request = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/occurrence-entries',
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      inventoryNumber: 'INV-001',
      numberOfObjects: 1,
      occurrenceDate: '2026-06-03T11:30:00',
      location: 'Conservation lab, room 2',
      detailedDescription: 'Surface abrasion reported during handling.',
      testimonial: 'Observed by the researcher.',
    });
    request.flush({
      id: 'occurrence-1',
      objectReference: {
        inventoryNumber: 'INV-001',
        displayTitle: null,
        objectName: null,
        briefDescriptionSnapshot: null,
      },
      numberOfObjects: 1,
      occurrenceDate: '2026-06-03T11:30:00',
      location: 'Conservation lab, room 2',
      reportedBy: {
        permissionId: 'permission-1',
        user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
        group: 'COLLECTIONS_MANAGEMENT',
      },
      detailedDescription: 'Surface abrasion reported during handling.',
      testimonial: 'Observed by the researcher.',
      attachments: [],
    });
  });

  it('lists object occurrence entries with reportedBy filters and occurrence log metadata', () => {
    service
      .listObjectOccurrenceEntries('project-1', {
        reportedBy: 'permission-1',
        page: 1,
        size: 10,
      })
      .subscribe();

    const request = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/occurrence-entries?reportedBy=permission-1&page=1&size=10',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('reportedBy')).toBe('permission-1');
    request.flush({
      projectId: 'project-1',
      occurrenceLog: {
        id: 'occurrence-log-1',
        referenceNumber: 'OOL-1A2B3C4D',
        projectId: 'project-1',
        dateConclusion: null,
        curator: null,
      },
      content: [],
      page: 1,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    });
  });

  it('gets and concludes object occurrence logs', () => {
    service.getObjectOccurrenceLog('project-1').subscribe();

    const getRequest = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/object-occurrence-log',
    );

    expect(getRequest.request.method).toBe('GET');
    getRequest.flush({
      id: 'occurrence-log-1',
      referenceNumber: 'OOL-1A2B3C4D',
      projectId: 'project-1',
      dateConclusion: null,
      curator: null,
    });

    service.concludeObjectOccurrenceLog('project-1').subscribe();

    const concludeRequest = http.expectOne(
      'https://api.example.test/collection-use-projects/project-1/object-occurrence-log/conclusion',
    );

    expect(concludeRequest.request.method).toBe('POST');
    expect(concludeRequest.request.body).toEqual({});
    concludeRequest.flush({
      id: 'occurrence-log-1',
      referenceNumber: 'OOL-1A2B3C4D',
      projectId: 'project-1',
      dateConclusion: '2026-06-04T16:00:00',
      curator: {
        permissionId: 'permission-1',
        user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
        group: 'COLLECTIONS_MANAGEMENT',
      },
    });
  });
});
