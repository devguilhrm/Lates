import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>((localStorage.getItem('pilatesos.theme') as ThemeMode) ?? 'dark');

  constructor() {
    effect(() => {
      const mode = this.mode();
      localStorage.setItem('pilatesos.theme', mode);
      document.documentElement.dataset['theme'] = mode;
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }
}
