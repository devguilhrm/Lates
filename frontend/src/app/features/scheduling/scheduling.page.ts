import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  template: `<h2>Agendamentos</h2><p>Calendário e criação de sessões.</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingPage {}
