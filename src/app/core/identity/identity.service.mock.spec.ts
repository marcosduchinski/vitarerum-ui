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
    expect(service.session()?.user.displayName).toBe('learner');
    expect(service.getAccessToken()).toBe('mock-access-token');

    service.signOut();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.session()).toBeNull();
  });
});
