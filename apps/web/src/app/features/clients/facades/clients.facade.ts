import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ClientsQuery } from '../state/clients.query';
import { ClientsService } from '../state/clients.service';

@Injectable({ providedIn: 'root' })
export class ClientsFacade {
  private readonly query = inject(ClientsQuery);
  private readonly service = inject(ClientsService);

  readonly clients = toSignal(this.query.clients$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });

  readonly activeCount = computed(
    () => this.clients().filter((client) => client.status === 'ACTIVE').length,
  );

  init(): void {
    this.service.watchClients();
  }
}
