import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(function () {
    return { send: sendMock };
  }),
  InitiateAuthCommand: vi.fn().mockImplementation(function (input) {
    return input;
  }),
}));

function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    sendMock.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('starts unauthenticated', () => {
    expect(service.isAuthenticatedSignal()).toBe(false);
    expect(service.getIdToken()).toBeNull();
  });

  it('logs in successfully and stores tokens', async () => {
    const idToken = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    sendMock.mockResolvedValue({
      AuthenticationResult: { IdToken: idToken, AccessToken: 'access', RefreshToken: 'refresh' },
    });

    const result = await service.login('treasury', 'password123');

    expect(result.success).toBe(true);
    expect(service.isAuthenticatedSignal()).toBe(true);
    expect(service.getIdToken()).toBe(idToken);
    expect(sessionStorage.getItem('colaready_id_token')).toBe(idToken);
  });

  it('maps NotAuthorizedException to a friendly error', async () => {
    const error = new Error('bad creds');
    error.name = 'NotAuthorizedException';
    sendMock.mockRejectedValue(error);

    const result = await service.login('treasury', 'wrong');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Incorrect username or password.');
    expect(service.isAuthenticatedSignal()).toBe(false);
  });

  it('logout clears tokens', async () => {
    const idToken = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    sendMock.mockResolvedValue({ AuthenticationResult: { IdToken: idToken } });
    await service.login('treasury', 'password123');

    service.logout();

    expect(service.isAuthenticatedSignal()).toBe(false);
    expect(service.getIdToken()).toBeNull();
    expect(sessionStorage.getItem('colaready_id_token')).toBeNull();
  });

  it('initialize restores a valid session from sessionStorage', () => {
    const idToken = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    sessionStorage.setItem('colaready_id_token', idToken);

    service.initialize();

    expect(service.isAuthenticatedSignal()).toBe(true);
    expect(service.getIdToken()).toBe(idToken);
  });

  it('initialize clears an expired session', () => {
    const idToken = fakeJwt({ exp: Math.floor(Date.now() / 1000) - 10 });
    sessionStorage.setItem('colaready_id_token', idToken);

    service.initialize();

    expect(service.isAuthenticatedSignal()).toBe(false);
    expect(sessionStorage.getItem('colaready_id_token')).toBeNull();
  });
});
