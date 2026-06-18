import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IDENTITY_SERVICE, IdentityService } from '@core/auth/identity.service';
import { GroupName } from '@core/auth/models/group-name.enum';
import { IdentitySession } from '@core/auth/models/identity-session.model';
import { LoginRequest } from '@core/auth/models/login.model';
import { firstValueFrom } from 'rxjs';

import {
  MOCK_SEED,
  MockProjectState,
  TEST_SEED,
} from '@features/collections/proposals/mocks/mock-data';

import { ReportsApiServiceMock } from './reports-api.service.mock';

const STAFF_SESSION: IdentitySession = {
  accessToken: 'token',
  user: { id: 'staff-1', email: 'bob@example.test', displayName: 'Bob Santos' },
  group: 'COLLECTIONS_MANAGEMENT',
  availableGroups: ['COLLECTIONS_MANAGEMENT'],
  permissions: [{ permissionId: 'perm-bob', group: 'COLLECTIONS_MANAGEMENT' }],
};

const EXTERNAL_SESSION: IdentitySession = {
  accessToken: 'token',
  user: { id: 'user-1', email: 'alice@example.test', displayName: 'Alice Ferreira' },
  group: 'EXTERNAL',
  availableGroups: ['EXTERNAL'],
  permissions: [{ permissionId: 'perm-alice', group: 'EXTERNAL' }],
};

let activeSession: IdentitySession = STAFF_SESSION;

class IdentityServiceStub implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(activeSession);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = signal(true).asReadonly();
  readonly isStaff = computed(() => {
    const group = this.session()?.group;
    return group != null && group !== 'EXTERNAL';
  });

  async signIn(credentials: LoginRequest): Promise<void> {
    const session = this.sessionState();
    if (session) {
      this.sessionState.set({ ...session, user: { ...session.user, email: credentials.email } });
    }
  }

  signOut(): void {
    this.sessionState.set(null);
  }

  getAccessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  getPermissionId(): string | null {
    const session = this.sessionState();
    return session?.permissions?.find((permission) => permission.group === session.group)
      ?.permissionId ?? null;
  }

  setGroup(group: GroupName): void {
    const session = this.sessionState();
    if (session) this.sessionState.set({ ...session, group });
  }

  updateAvailableGroups(groups: readonly GroupName[]): void {
    const session = this.sessionState();
    if (session) this.sessionState.set({ ...session, availableGroups: [...groups] });
  }
}

describe('ReportsApiServiceMock', () => {
  let service: ReportsApiServiceMock;

  beforeEach(() => {
    activeSession = STAFF_SESSION;
    TestBed.configureTestingModule({
      providers: [
        { provide: MOCK_SEED, useValue: TEST_SEED },
        MockProjectState,
        ReportsApiServiceMock,
        { provide: IDENTITY_SERVICE, useClass: IdentityServiceStub },
      ],
    });

    service = TestBed.inject(ReportsApiServiceMock);
  });

  it('lists completed and cancelled visits in situ for staff', async () => {
    const page = await firstValueFrom(service.listVisitsInSitu({ size: 20 }));

    expect(page.content.map((row) => row.referenceNumber)).toEqual(['VR-2026-007', 'VR-2026-006']);
    expect(page.content.every((row) => row.status === 'COMPLETED' || row.status === 'CANCELLED'))
      .toBe(true);
    expect(page.content[0].closedAt).toBe('2026-06-05T09:00:00Z');
    expect(page.content[1].closedAt).toBe('2026-06-03T09:30:00Z');
  });

  it('filters by terminal status and search text', async () => {
    const page = await firstValueFrom(
      service.listVisitsInSitu({ status: ['CANCELLED'], search: 'botanical', size: 20 }),
    );

    expect(page.content).toHaveLength(1);
    expect(page.content[0]).toMatchObject({
      referenceNumber: 'VR-2026-006',
      status: 'CANCELLED',
      title: 'Botanical herbarium records of medicinal plant collections',
    });
  });

  it('rejects non-staff access', async () => {
    activeSession = EXTERNAL_SESSION;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: MOCK_SEED, useValue: TEST_SEED },
        MockProjectState,
        ReportsApiServiceMock,
        { provide: IDENTITY_SERVICE, useClass: IdentityServiceStub },
      ],
    });
    service = TestBed.inject(ReportsApiServiceMock);

    await expect(firstValueFrom(service.listVisitsInSitu())).rejects.toMatchObject({
      status: 403,
      error: 'ACCESS_DENIED',
    });
  });
});
