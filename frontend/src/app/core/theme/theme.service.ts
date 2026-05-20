import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'latesos.theme';
const LEGACY_THEME_KEY = 'pilatesos.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>((localStorage.getItem(THEME_KEY) as ThemeMode) ?? (localStorage.getItem(LEGACY_THEME_KEY) as ThemeMode) ?? 'light');

  constructor() {
    effect(() => {
      const mode = this.mode();
      localStorage.setItem(THEME_KEY, mode);
      localStorage.removeItem(LEGACY_THEME_KEY);
      document.documentElement.dataset['theme'] = mode;
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }
}
