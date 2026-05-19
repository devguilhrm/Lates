import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SchedulingStatus } from '../../core/models/domain.models';

const labels: Record<SchedulingStatus, string> = {
  SCHEDULED: 'Agendado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Falta',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="status()">{{ labels[status()] }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 1.5rem;
      padding: 0 0.55rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .SCHEDULED { color: #0369a1; background: #e0f2fe; }
    .COMPLETED { color: #047857; background: #d1fae5; }
    .CANCELLED { color: #b91c1c; background: #fee2e2; }
    .NO_SHOW { color: #b45309; background: #fef3c7; }
    :host-context([data-theme='dark']) .SCHEDULED { color: #7dd3fc; background: #0c4a6e; }
    :host-context([data-theme='dark']) .COMPLETED { color: #86efac; background: #14532d; }
    :host-context([data-theme='dark']) .CANCELLED { color: #fca5a5; background: #7f1d1d; }
    :host-context([data-theme='dark']) .NO_SHOW { color: #fcd34d; background: #713f12; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<SchedulingStatus>();
  protected readonly labels = labels;
}
