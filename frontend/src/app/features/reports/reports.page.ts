import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  template: `<h2>Relatórios</h2><p>Ocupação e indicadores.</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage {}
