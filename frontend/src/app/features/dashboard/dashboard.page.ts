import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  template: `<h2>Dashboard</h2><p>Métricas gerais da clínica.</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
