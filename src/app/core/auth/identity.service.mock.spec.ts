import { IdentityServiceMock } from './identity.service.mock';

describe('IdentityServiceMock', () => {
  it('updates authentication signals when signing in and out', () => {
    const service = new IdentityServiceMock();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.session()).toBeNull();
    expect(service.getAccessToken()).toBeNull();

    service.signIn('learner@example.com');

    expect(service.isAuthenticated()).toBe(true);
    expect(service.session()?.user.email).toBe('learner@example.com');
    expect(service.getAccessToken()).toBe('mock-access-token');

    service.signOut();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.session()).toBeNull();
  });

  it('sets the correct group and name for known mock accounts', () => {
    const service = new IdentityServiceMock();

    service.signIn('alice@ext.example.com');
    expect(service.session()?.group).toBe('EXTERNAL');
    expect(service.session()?.user.displayName).toBe('Alice Ferreira');
    expect(service.session()?.availableGroups).toEqual(['EXTERNAL']);

    service.signIn('bob@collections.example.com');
    expect(service.session()?.group).toBe('COLLECTIONS_MANAGEMENT');
    expect(service.session()?.availableGroups).toEqual(['COLLECTIONS_MANAGEMENT']);

    service.signIn('eve@admin.example.com');
    expect(service.session()?.group).toBe('ADMIN');
    expect(service.session()?.availableGroups).toEqual(['ADMIN']);
  });

  it('defaults unknown emails to EXTERNAL group', () => {
    const service = new IdentityServiceMock();
    service.signIn('stranger@example.com');
    expect(service.session()?.group).toBe('EXTERNAL');
    expect(service.session()?.availableGroups).toEqual(['EXTERNAL']);
  });

  it('setGroup succeeds when the group is in availableGroups', () => {
    const service = new IdentityServiceMock();
    service.signIn('alice@ext.example.com');
    service.setGroup('EXTERNAL');
    expect(service.session()?.group).toBe('EXTERNAL');
  });

  it('setGroup is ignored when the group is not in availableGroups', () => {
    const service = new IdentityServiceMock();
    service.signIn('alice@ext.example.com'); // only EXTERNAL
    service.setGroup('ADMIN');               // not allowed
    expect(service.session()?.group).toBe('EXTERNAL'); // unchanged
  });

  it('multi-group user can switch between their three groups', () => {
    const service = new IdentityServiceMock();
    service.signIn('fran@staff.example.com');

    expect(service.session()?.availableGroups).toEqual([
      'COLLECTIONS_MANAGEMENT', 'CURATORIAL', 'DIRECTION',
    ]);
    expect(service.session()?.group).toBe('COLLECTIONS_MANAGEMENT'); // first group on sign-in

    service.setGroup('CURATORIAL');
    expect(service.session()?.group).toBe('CURATORIAL');

    service.setGroup('DIRECTION');
    expect(service.session()?.group).toBe('DIRECTION');

    // Cannot switch to a group outside their list
    service.setGroup('ADMIN');
    expect(service.session()?.group).toBe('DIRECTION'); // unchanged
  });
});
