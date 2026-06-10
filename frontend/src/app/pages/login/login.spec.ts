import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../../core/auth/auth';

describe('Login', () => {
  let loginMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    loginMock = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([{ path: '', component: Login }]),
        { provide: AuthService, useValue: { login: loginMock } },
      ],
    }).compileComponents();
  });

  it('shows an error message on failed login', async () => {
    loginMock.mockResolvedValue({ success: false, error: 'Incorrect username or password.' });

    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;

    component['username'] = 'treasury';
    component['password'] = 'wrong';
    await component.onSubmit();
    fixture.detectChanges();

    expect(component['error']()).toBe('Incorrect username or password.');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Incorrect username or password.');
  });

  it('navigates to / on successful login', async () => {
    loginMock.mockResolvedValue({ success: true });

    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    component['username'] = 'treasury';
    component['password'] = 'correct';
    await component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });
});
