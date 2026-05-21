import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let authMock: {
    login: ReturnType<typeof vi.fn>;
    storeTokens: ReturnType<typeof vi.fn>;
    role: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authMock = {
      login: vi.fn(),
      storeTokens: vi.fn(),
      role: vi.fn(),
    };

    routerMock = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
        { provide: ThemeService, useValue: { toggle: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('deve autenticar e navegar para agenda do cliente', async () => {
    authMock.login.mockReturnValue(of({ accessToken: 'token-a', refreshToken: 'token-r' }));
    authMock.role.mockReturnValue('CLIENT');

    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance as any;
    page.form.controls.email.setValue('cliente@latesos.com');
    page.form.controls.password.setValue('senha123');

    page.submit();
    await fixture.whenStable();

    expect(authMock.login).toHaveBeenCalledWith('cliente@latesos.com', 'senha123');
    expect(authMock.storeTokens).toHaveBeenCalledWith({
      accessToken: 'token-a',
      refreshToken: 'token-r',
    });
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/my-schedule');
  });

  it('deve exibir erro de autenticacao no formulario', async () => {
    authMock.login.mockReturnValue(
      throwError(() => ({
        error: { message: 'Credenciais invalidas.' },
      })),
    );

    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance as any;
    page.form.controls.email.setValue('cliente@latesos.com');
    page.form.controls.password.setValue('senha123');

    page.submit();
    await fixture.whenStable();

    expect(page.error()).toBe('Credenciais invalidas.');
    expect(page.loading()).toBe(false);
  });
});
