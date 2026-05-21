import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
    document.documentElement.dataset['theme'] = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.dataset['theme'] = '';
  });

  it('deve iniciar em modo light por padrao', () => {
    const service = TestBed.inject(ThemeService);
    TestBed.flushEffects();

    expect(service.mode()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('deve alternar entre light e dark', () => {
    const service = TestBed.inject(ThemeService);
    TestBed.flushEffects();

    service.toggle();
    TestBed.flushEffects();
    expect(service.mode()).toBe('dark');
    expect(localStorage.getItem('latesos.theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');

    service.toggle();
    TestBed.flushEffects();
    expect(service.mode()).toBe('light');
    expect(localStorage.getItem('latesos.theme')).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
