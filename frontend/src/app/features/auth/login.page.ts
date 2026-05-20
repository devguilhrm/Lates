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
          <img class="brand-logo" src="assets/logo.png" alt="Logo LatesOS" />
        </div>

        <div>
          <h1>Entrar na operacao</h1>
          <p>Acesse agenda, cadastros, financeiro e relatorios em um unico painel.</p>
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
          <span>Login seed: valor de ADMIN_EMAIL no backend (padrao comum: admin&#64;pilatesos.com)</span>
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
      padding: 1.25rem;
      color: var(--text);
      background:
        radial-gradient(circle at 12% 10%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 35%),
        radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 28%),
        var(--background);
    }

    .login-panel {
      width: min(28.5rem, 100%);
      display: grid;
      gap: 1.25rem;
      padding: 1.5rem;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 1rem;
      box-shadow: var(--shadow-strong);
    }

    .brand-row {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 0.15rem;
    }

    .brand-logo {
      width: min(20rem, 82vw);
      max-width: 100%;
      height: clamp(4.2rem, 11vw, 5.8rem);
      object-fit: contain;
      display: block;
    }

    small,
    p,
    footer {
      color: var(--muted);
    }

    h1 {
      margin: 0 0 0.35rem;
      font-size: 1.35rem;
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
      font-size: 0.82rem;
    }

    @media (max-width: 720px) {
      .brand-logo {
        width: min(17rem, 76vw);
        height: clamp(3.6rem, 16vw, 4.6rem);
      }

      footer {
        flex-direction: column;
        align-items: flex-start;
      }
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
        const target = this.auth.role() === 'CLIENT' ? '/my-schedule' : '/dashboard';
        void this.router.navigateByUrl(target);
      },
      error: (error) => {
        const message =
          error?.error?.message ??
          'Nao foi possivel entrar. Confira ADMIN_EMAIL/ADMIN_PASSWORD e se o backend esta rodando.';
        this.error.set(Array.isArray(message) ? message.join(' | ') : String(message));
        this.loading.set(false);
      },
    });
  }
}
