import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../http/api.service';
import { AuthService } from './auth.service';

function createFakeJwt(role: string) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ role }));
  return `${header}.${payload}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let apiMock: { post: ReturnType<typeof vi.fn> };
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    apiMock = {
      post: vi.fn(),
    };
    routerMock = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve delegar login para ApiService', () => {
    apiMock.post.mockReturnValue(of({ accessToken: 'a', refreshToken: 'b' }));

    service.login('cliente@latesos.com', '123456').subscribe();

    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
      email: 'cliente@latesos.com',
      password: '123456',
    });
  });

  it('deve armazenar tokens e definir role pelo payload JWT', () => {
    const accessToken = createFakeJwt('CLIENT');
    service.storeTokens({ accessToken, refreshToken: 'refresh-token' });

    expect(localStorage.getItem('latesos.accessToken')).toBe(accessToken);
    expect(localStorage.getItem('latesos.refreshToken')).toBe('refresh-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.role()).toBe('CLIENT');
  });

  it('deve limpar sessao e navegar para login no logout', () => {
    const accessToken = createFakeJwt('ADMIN');
    service.storeTokens({ accessToken, refreshToken: 'refresh-token' });

    service.logout();

    expect(localStorage.getItem('latesos.accessToken')).toBeNull();
    expect(localStorage.getItem('latesos.refreshToken')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.role()).toBeNull();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
