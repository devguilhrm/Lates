import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  template: `<h2>Profissionais</h2><p>Cadastro e disponibilidade semanal.</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsPage {}
