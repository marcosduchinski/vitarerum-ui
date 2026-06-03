import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from 'src/app/core/config/app-config.model';

import { ProposalApiService } from './proposal-api.service';

describe('ProposalApiService', () => {
  let service: ProposalApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
        ProposalApiService,
      ],
    });

    service = TestBed.inject(ProposalApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('creates a proposal with the documented body', () => {
    const body = {
      title: 'Specimen study',
      type: 'RESEARCH' as const,
      purpose: 'Research',
      beginDate: '2026-06-01',
      endDate: '2026-06-30',
    };

    service.createProposal(body).subscribe();

    const request = http.expectOne('https://api.example.test/proposals');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({
      proposal: {
        id: 'proposal-1',
        status: 'SUBMITTED',
        type: 'RESEARCH',
        requestedBy: {
          permissionId: 'permission-1',
          user: { id: 'user-1', name: 'Ana', email: 'ana@example.test' },
          group: 'EXTERNAL',
        },
        assignedTo: null,
        submittedAt: '2026-01-01T10:00:00',
      },
      collectionUseProject: {
        id: 'project-1',
        referenceNumber: 'CUP-2026-0001',
        title: 'Specimen study',
        purpose: 'Research',
        type: 'RESEARCH',
        status: 'REQUESTED',
        beginDate: '2026-06-01',
        endDate: '2026-06-30',
      },
      conversationId: 'conversation-1',
    });
  });

  it('lists proposals with filters', () => {
    service
      .listProposals({
        status: 'UNDER_REVIEW',
        lifecyclePhase: 'PENDING',
        type: 'RESEARCH',
        requestedBy: 'permission-external',
        assignedTo: 'permission-1',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        search: 'CUP',
        page: 1,
        size: 25,
      })
      .subscribe();

    const request = http.expectOne(
      'https://api.example.test/proposals?status=UNDER_REVIEW&lifecyclePhase=PENDING&type=RESEARCH&requestedBy=permission-external&assignedTo=permission-1&dateFrom=2026-01-01&dateTo=2026-01-31&search=CUP&page=1&size=25',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('status')).toBe('UNDER_REVIEW');
    expect(request.request.params.get('lifecyclePhase')).toBe('PENDING');
    expect(request.request.params.get('requestedBy')).toBe('permission-external');
    expect(request.request.params.get('assignedTo')).toBe('permission-1');
    request.flush({ content: [], page: 1, size: 25, totalElements: 0, totalPages: 0 });
  });

  it('uploads proposal documents as multipart form data', () => {
    const file = new File(['document'], 'research_form.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    service.uploadDocument('proposal-1', file, 'RESEARCH_FORM').subscribe();

    const request = http.expectOne('https://api.example.test/proposals/proposal-1/documents');

    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBe(true);
    expect((request.request.body as FormData).get('file')).toBe(file);
    expect((request.request.body as FormData).get('documentType')).toBe('RESEARCH_FORM');
    request.flush({
      id: 'document-1',
      type: 'RESEARCH_FORM',
      fileName: 'research_form.docx',
      fileReference: 'files/document-1',
      submittedAt: '2026-01-01T10:00:00',
    });
  });

  it('posts proposal decision actions to documented endpoints', () => {
    service.approveProposal('proposal-1', { note: 'Approved' }).subscribe();

    const request = http.expectOne('https://api.example.test/proposals/proposal-1/approve');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ note: 'Approved' });
    request.flush({
      proposal: { id: 'proposal-1', status: 'APPROVED', lastEvent: null },
      collectionUseProject: {
        id: 'project-1',
        referenceNumber: 'CUP-2026-0001',
        title: 'Specimen study',
        status: 'ACCEPTED',
      },
    });
  });

  it('adds a proposal watcher with the documented body', () => {
    service.addWatcher('proposal-1', { permissionId: 'permission-2' }).subscribe();

    const request = http.expectOne('https://api.example.test/proposals/proposal-1/watchers');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ permissionId: 'permission-2' });
    request.flush({
      permissionId: 'permission-2',
      user: { id: 'user-2', name: 'Carol', email: 'carol@example.test' },
      group: 'CURATORIAL',
    });
  });

  it('removes a proposal watcher by permission id', () => {
    service.removeWatcher('proposal-1', 'permission-2').subscribe();

    const request = http.expectOne(
      'https://api.example.test/proposals/proposal-1/watchers/permission-2',
    );

    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
