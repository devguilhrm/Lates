import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../http/api.service';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly accessTokenSignal = signal(localStorage.getItem('pilatesos.accessToken'));

  readonly isAuthenticated = computed(() => !!this.accessTokenSignal());

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  login(email: string, password: string) {
    return this.api.post<AuthTokens>('/auth/login', { email, password });
  }

  storeTokens(tokens: AuthTokens): void {
    localStorage.setItem('pilatesos.accessToken', tokens.accessToken);
    localStorage.setItem('pilatesos.refreshToken', tokens.refreshToken);
    this.accessTokenSignal.set(tokens.accessToken);
  }

  logout(): void {
    localStorage.removeItem('pilatesos.accessToken');
    localStorage.removeItem('pilatesos.refreshToken');
    this.accessTokenSignal.set(null);
    void this.router.navigateByUrl('/login');
  }
}
