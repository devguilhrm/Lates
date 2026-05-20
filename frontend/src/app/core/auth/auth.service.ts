import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http/api.service';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'latesos.accessToken';
const REFRESH_TOKEN_KEY = 'latesos.refreshToken';
const LEGACY_ACCESS_TOKEN_KEY = 'pilatesos.accessToken';
const LEGACY_REFRESH_TOKEN_KEY = 'pilatesos.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly accessTokenSignal = signal(
    localStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY),
  );

  readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  login(email: string, password: string) {
    return this.api.post<AuthTokens>('/auth/login', { email, password });
  }

  storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    this.accessTokenSignal.set(tokens.accessToken);
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    this.accessTokenSignal.set(null);
    void this.router.navigateByUrl('/login');
  }
}
