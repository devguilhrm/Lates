import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  template: `<h2>Clientes</h2><p>Listagem e gestão de clientes.</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsPage {}
