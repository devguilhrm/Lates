import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="login-panel">
        <div class="brand-row">
          <span class="brand-mark">P</span>
          <div>
            <strong>PilatesOS</strong>
            <small>Gestão clínica</small>
          </div>
        </div>
        <div>
          <h1>Entrar na operação</h1>
          <p>Acesse a agenda, cadastros e indicadores da clínica.</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label class="field">
            <span>E-mail</span>
            <input type="email" formControlName="email" autocomplete="email" />
          </label>
          <label class="field">
            <span>Senha</span>
            <input type="password" formControlName="password" autocomplete="current-password" />
          </label>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button class="primary-button" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>
        <footer>
          <span>Admin inicial: admin&#64;pilatesos.com</span>
          <button type="button" class="secondary-button" (click)="theme.toggle()">Alternar tema</button>
        </footer>
      </section>
    </main>
  `,
  styles: `
    .login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1rem;
      color: var(--text);
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), transparent 38%),
        var(--background);
    }
    .login-panel {
      width: min(27rem, 100%);
      display: grid;
      gap: 1.3rem;
      padding: 1.4rem;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 0.65rem;
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.65rem;
      background: var(--accent);
      color: #fff;
      font-weight: 900;
    }
    small,
    p,
    footer {
      color: var(--muted);
    }
    h1 {
      margin: 0 0 0.35rem;
    }
    form {
      display: grid;
      gap: 0.85rem;
    }
    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      font-size: 0.85rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['admin@pilatesos.com', [Validators.required, Validators.email]],
    password: ['admin123', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.form.controls.email.value, this.form.controls.password.value).subscribe({
      next: (tokens) => {
        this.auth.storeTokens(tokens);
        void this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.error.set('Não foi possível entrar. Confira as credenciais e se a API está rodando.');
        this.loading.set(false);
      },
    });
  }
}
