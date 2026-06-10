import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

/** Attaches the Cognito ID token to requests against the backend API. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.api.baseUrl)) {
    return next(req);
  }

  const idToken = inject(AuthService).getIdToken();
  if (!idToken) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${idToken}` } }));
};
