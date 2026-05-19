import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiEnvelope, PaginatedResult } from './api.types';

const API_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
    return this.http
      .get<ApiEnvelope<T>>(this.url(path), { params: this.toParams(params) })
      .pipe(map((response) => response.data));
  }

  getPaginated<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
    return this.http
      .get<ApiEnvelope<PaginatedResult<T>>>(this.url(path), { params: this.toParams(params) })
      .pipe(map((response) => response.data));
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<ApiEnvelope<T>>(this.url(path), body).pipe(map((response) => response.data));
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<ApiEnvelope<T>>(this.url(path), body).pipe(map((response) => response.data));
  }

  delete(path: string) {
    return this.http.delete<void>(this.url(path));
  }

  private url(path: string): string {
    return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private toParams(params?: Record<string, string | number | boolean | undefined | null>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
