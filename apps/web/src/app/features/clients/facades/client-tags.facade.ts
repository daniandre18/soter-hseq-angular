import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ClientTagsQuery } from '../state/client-tags.query';
import { ClientTagsService } from '../state/client-tags.service';
import { AuthFacade } from '../../auth/facades/auth.facade';
import type { ClientTag, NewClientTag } from '../models/client-tag.model';

/** Único punto de contacto entre la UI y el catálogo de etiquetas de cliente. */
@Injectable({ providedIn: 'root' })
export class ClientTagsFacade {
  private readonly query = inject(ClientTagsQuery);
  private readonly service = inject(ClientTagsService);
  private readonly authFacade = inject(AuthFacade);

  readonly tags = toSignal(this.query.tags$, { initialValue: [] });
  readonly loading = toSignal(this.query.loading$, { initialValue: false });

  init(): void {
    this.service.watchTags();
  }

  byId(id: string): ClientTag | undefined {
    return this.tags().find((tag) => tag.id === id);
  }

  async addTag(data: NewClientTag): Promise<string> {
    const userId = this.authFacade.currentUser()?.id ?? 'unknown';
    return this.service.addTag(data, userId);
  }

  async deleteTag(id: string): Promise<void> {
    await this.service.deleteTag(id);
  }
}
