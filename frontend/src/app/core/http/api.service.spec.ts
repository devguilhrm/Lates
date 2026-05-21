import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve montar GET com parametros e retornar data do envelope', () => {
    let result: { ok: boolean } | undefined;
    service
      .get<{ ok: boolean }>('/health', {
        active: true,
        page: 1,
        search: '',
        ignored: undefined,
      })
      .subscribe((value) => {
        result = value;
      });

    const req = httpMock.expectOne((request) => request.url === 'http://localhost:3000/health');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('active')).toBe('true');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('ignored')).toBe(false);

    req.flush({ data: { ok: true } });
    expect(result).toEqual({ ok: true });
  });

  it('deve enviar POST e retornar payload desserializado', () => {
    let response: { id: string } | undefined;
    service.post<{ id: string }>('/clients', { name: 'Maria' }).subscribe((value) => (response = value));

    const req = httpMock.expectOne('http://localhost:3000/clients');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Maria' });
    req.flush({ data: { id: 'client-1' } });

    expect(response).toEqual({ id: 'client-1' });
  });

  it('deve enviar PATCH e retornar payload desserializado', () => {
    let response: { status: string } | undefined;
    service.patch<{ status: string }>('/schedulings/1/cancel', { reason: 'Imprevisto' }).subscribe((value) => {
      response = value;
    });

    const req = httpMock.expectOne('http://localhost:3000/schedulings/1/cancel');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ reason: 'Imprevisto' });
    req.flush({ data: { status: 'CANCELLED' } });

    expect(response).toEqual({ status: 'CANCELLED' });
  });
});
