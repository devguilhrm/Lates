import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http/api.service';
import { UserRole } from '../models/domain.models';

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
  private readonly roleSignal = signal<UserRole | null>(
    this.parseRoleFromToken(this.accessTokenSignal()),
  );

  readonly isAuthenticated = computed(() => !!this.accessTokenSignal());
  readonly role = computed(() => this.roleSignal());

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
    this.roleSignal.set(this.parseRoleFromToken(tokens.accessToken));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    this.accessTokenSignal.set(null);
    this.roleSignal.set(null);
    void this.router.navigateByUrl('/login');
  }

  private parseRoleFromToken(token: string | null): UserRole | null {
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const decoded = JSON.parse(atob(payload)) as { role?: UserRole };
      return decoded.role ?? null;
    } catch {
      return null;
    }
  }
}
