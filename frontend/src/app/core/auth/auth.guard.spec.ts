import { TestBed } from '@angular/core/testing';
import { provideRouter, type ActivatedRouteSnapshot, type RouterStateSnapshot, type UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth';

describe('authGuard', () => {
  function configure(isAuthenticated: boolean): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticatedSignal: () => isAuthenticated } },
      ],
    });
  }

  it('allows navigation when authenticated', () => {
    configure(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('redirects to /login with a returnUrl when not authenticated', () => {
    configure(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/verify' } as RouterStateSnapshot),
    ) as UrlTree;

    expect(result.toString()).toContain('/login');
    expect(result.toString()).toContain('returnUrl');
  });
});
