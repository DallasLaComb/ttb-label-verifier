import { Injectable, signal } from '@angular/core';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  type AuthenticationResultType,
} from '@aws-sdk/client-cognito-identity-provider';
import { environment } from '../../../environments/environment';

const TOKEN_KEYS = {
  id: 'colaready_id_token',
  access: 'colaready_access_token',
  refresh: 'colaready_refresh_token',
} as const;

const AUTH_ERROR_MAP: Record<string, string> = {
  NotAuthorizedException: 'Incorrect username or password.',
  UserNotFoundException: 'Incorrect username or password.',
  PasswordResetRequiredException: 'Password reset required. Contact the site administrator.',
  UserNotConfirmedException: 'Account not confirmed. Contact the site administrator.',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = new CognitoIdentityProviderClient({
    region: environment.cognito.region,
  });

  private readonly _isAuthenticated = signal(false);
  readonly isAuthenticatedSignal = this._isAuthenticated.asReadonly();

  private idToken: string | null = null;

  /** Restores a still-valid session from sessionStorage on app boot. */
  initialize(): void {
    const idToken = sessionStorage.getItem(TOKEN_KEYS.id);
    if (idToken && !this.isTokenExpired(idToken)) {
      this.idToken = idToken;
      this._isAuthenticated.set(true);
    } else if (idToken) {
      this.clearTokens();
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: environment.cognito.clientId,
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
        }),
      );

      if (!response.AuthenticationResult?.IdToken) {
        return { success: false, error: 'Unexpected response from authentication service.' };
      }

      this.storeTokens(response.AuthenticationResult);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: this.mapAuthError(err) };
    }
  }

  logout(): void {
    this.clearTokens();
  }

  getIdToken(): string | null {
    return this.idToken;
  }

  private storeTokens(result: AuthenticationResultType): void {
    this.idToken = result.IdToken ?? null;

    if (result.IdToken) sessionStorage.setItem(TOKEN_KEYS.id, result.IdToken);
    if (result.AccessToken) sessionStorage.setItem(TOKEN_KEYS.access, result.AccessToken);
    if (result.RefreshToken) sessionStorage.setItem(TOKEN_KEYS.refresh, result.RefreshToken);

    this._isAuthenticated.set(true);
  }

  private clearTokens(): void {
    this.idToken = null;
    this._isAuthenticated.set(false);

    sessionStorage.removeItem(TOKEN_KEYS.id);
    sessionStorage.removeItem(TOKEN_KEYS.access);
    sessionStorage.removeItem(TOKEN_KEYS.refresh);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private mapAuthError(err: unknown): string {
    if (!(err instanceof Error)) return 'An unexpected error occurred. Please try again.';
    return AUTH_ERROR_MAP[err.name] ?? 'An unexpected error occurred. Please try again.';
  }
}
