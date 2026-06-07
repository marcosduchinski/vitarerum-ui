import { IdentityServiceMock } from './identity.service.mock';

function signIn(service: IdentityServiceMock, email: string): Promise<void> {
  return service.signIn({ email, password: 'pw' });
}

describe('IdentityServiceMock', () => {
  it('updates authentication signals when signing in and out', async () => {
    const service = new IdentityServiceMock();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.session()).toBeNull();
    expect(service.getAccessToken()).toBeNull();

    await signIn(service, 'learner@example.com');

    expect(service.isAuthenticated()).toBe(true);
    expect(service.session()?.user.email).toBe('learner@example.com');
    expect(service.getAccessToken()).toBe('mock-access-token');

    service.signOut();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.session()).toBeNull();
  });

  it('sets the correct group and name for known mock accounts', async () => {
    const service = new IdentityServiceMock();

    await signIn(service, 'alice@ext.example.com');
    expect(service.session()?.group).toBe('EXTERNAL');
    expect(service.session()?.user.displayName).toBe('Alice Ferreira');
    expect(service.session()?.availableGroups).toEqual(['EXTERNAL']);

    await signIn(service, 'bob@collections.example.com');
    expect(service.session()?.group).toBe('COLLECTIONS_MANAGEMENT');
    expect(service.session()?.availableGroups).toEqual(['COLLECTIONS_MANAGEMENT']);

    await signIn(service, 'eve@admin.example.com');
    expect(service.session()?.group).toBe('ADMINISTRATION');
    expect(service.session()?.availableGroups).toEqual(['ADMINISTRATION']);
  });

  it('defaults unknown emails to EXTERNAL group', async () => {
    const service = new IdentityServiceMock();
    await signIn(service, 'stranger@example.com');
    expect(service.session()?.group).toBe('EXTERNAL');
    expect(service.session()?.availableGroups).toEqual(['EXTERNAL']);
  });

  it('exposes a permission id for the active group', async () => {
    const service = new IdentityServiceMock();
    expect(service.getPermissionId()).toBeNull();

    await signIn(service, 'alice@ext.example.com');
    expect(service.getPermissionId()).toBe('perm-u-alice-EXTERNAL');
  });

  it('setGroup succeeds when the group is in availableGroups', async () => {
    const service = new IdentityServiceMock();
    await signIn(service, 'alice@ext.example.com');
    service.setGroup('EXTERNAL');
    expect(service.session()?.group).toBe('EXTERNAL');
  });

  it('setGroup is ignored when the group is not in availableGroups', async () => {
    const service = new IdentityServiceMock();
    await signIn(service, 'alice@ext.example.com'); // only EXTERNAL
    service.setGroup('ADMINISTRATION'); // not allowed
    expect(service.session()?.group).toBe('EXTERNAL'); // unchanged
  });

  it('multi-group user can switch groups and the permission id follows', async () => {
    const service = new IdentityServiceMock();
    await signIn(service, 'fran@staff.example.com');

    expect(service.session()?.availableGroups).toEqual([
      'COLLECTIONS_MANAGEMENT',
      'CURATORIAL',
      'DIRECTION',
    ]);
    expect(service.session()?.group).toBe('COLLECTIONS_MANAGEMENT'); // first group on sign-in
    expect(service.getPermissionId()).toBe('perm-u-fran-COLLECTIONS_MANAGEMENT');

    service.setGroup('CURATORIAL');
    expect(service.session()?.group).toBe('CURATORIAL');
    expect(service.getPermissionId()).toBe('perm-u-fran-CURATORIAL');

    service.setGroup('DIRECTION');
    expect(service.session()?.group).toBe('DIRECTION');

    // Cannot switch to a group outside their list.
    service.setGroup('ADMINISTRATION');
    expect(service.session()?.group).toBe('DIRECTION'); // unchanged
  });
});
