import { IdentityServiceImpl } from './identity.service.impl';

describe('IdentityServiceImpl', () => {
  it('does not create a local development session for real auth', () => {
    const service = new IdentityServiceImpl();

    service.signIn('alice@example.com');

    expect(service.isAuthenticated()).toBe(false);
    expect(service.session()).toBeNull();
    expect(service.getAccessToken()).toBeNull();
  });

  it('does not set groups without an IdP-backed session', () => {
    const service = new IdentityServiceImpl();

    service.setGroup('EXTERNAL');
    service.updateAvailableGroups(['EXTERNAL']);

    expect(service.session()).toBeNull();
  });
});
