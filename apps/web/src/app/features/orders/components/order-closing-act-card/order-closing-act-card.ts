import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { OrdersFacade } from '../../facades/orders.facade';
import type { ClosingAct, ClosingActContent } from '../../models/closing-act.model';
import type { TechnicalNote } from '../../models/note.model';
import type { ServiceOrder } from '../../models/order.model';

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Sección "Acta" del antiguo modal, portada tal cual como su propia
 *  tarjeta (generar borrador con IA / editar / aprobar / cerrar+PDF) — sin
 *  cambios de lógica, CLAUDE.md §11.5-§11.6. */
@Component({
  selector: 'app-order-closing-act-card',
  imports: [Button, StatusBadge, TranslocoPipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-closing-act-card.html',
  styleUrl: './order-closing-act-card.scss',
})
export class OrderClosingActCard {
  private readonly ordersFacade = inject(OrdersFacade);
  private readonly transloco = inject(TranslocoService);

  readonly order = input.required<ServiceOrder>();
  readonly notes = input<TechnicalNote[]>([]);
  readonly closingAct = input<ClosingAct | null>(null);
  readonly canRequestActa = input(false);
  readonly canEditActa = input(false);
  readonly canApproveActa = input(false);
  readonly canCloseOrder = input(false);

  protected readonly generatingActa = signal(false);
  protected readonly savingActa = signal(false);
  protected readonly approvingActa = signal(false);
  protected readonly closingOrder = signal(false);
  protected readonly pdfUrl = signal<string | null>(null);
  protected readonly actaError = signal<string | null>(null);

  protected readonly actExecutiveSummary = linkedSignal(() => this.closingAct()?.executiveSummary ?? '');
  protected readonly actActivitiesText = linkedSignal(
    () => this.closingAct()?.performedActivities.join('\n') ?? '',
  );
  protected readonly actFindingsText = linkedSignal(() => this.closingAct()?.findings.join('\n') ?? '');
  protected readonly actRecommendationsText = linkedSignal(
    () => this.closingAct()?.recommendations.join('\n') ?? '',
  );
  protected readonly actConclusions = linkedSignal(() => this.closingAct()?.conclusions ?? '');
  protected readonly actLimitations = linkedSignal(() => this.closingAct()?.limitations ?? '');

  protected async generateActa(): Promise<void> {
    const order = this.order();
    this.generatingActa.set(true);
    this.actaError.set(null);
    try {
      const summary = this.ordersFacade.buildNotesSummary(order, this.notes());
      await this.ordersFacade.generateClosingActDraft(order.id, summary);
    } catch {
      this.actaError.set(this.transloco.translate('orders.toast.draftError'));
    } finally {
      this.generatingActa.set(false);
    }
  }

  protected async saveActaContent(): Promise<void> {
    const act = this.closingAct();
    if (!act) {
      return;
    }
    const content: ClosingActContent = {
      executiveSummary: this.actExecutiveSummary().trim(),
      performedActivities: linesToArray(this.actActivitiesText()),
      findings: linesToArray(this.actFindingsText()),
      recommendations: linesToArray(this.actRecommendationsText()),
      conclusions: this.actConclusions().trim() || undefined,
      limitations: this.actLimitations().trim() || undefined,
    };
    this.savingActa.set(true);
    this.actaError.set(null);
    try {
      await this.ordersFacade.updateClosingActContent(act.id, content);
    } catch {
      this.actaError.set(this.transloco.translate('orders.toast.actSaveError'));
    } finally {
      this.savingActa.set(false);
    }
  }

  protected async approveActa(): Promise<void> {
    const act = this.closingAct();
    if (!act) {
      return;
    }
    this.approvingActa.set(true);
    this.actaError.set(null);
    try {
      await this.ordersFacade.approveClosingAct(act.id, this.order().id);
    } catch {
      this.actaError.set(this.transloco.translate('orders.toast.actApproveError'));
    } finally {
      this.approvingActa.set(false);
    }
  }

  protected async closeOrderAndGeneratePdf(): Promise<void> {
    const act = this.closingAct();
    if (!act) {
      return;
    }
    this.closingOrder.set(true);
    this.actaError.set(null);
    try {
      const url = await this.ordersFacade.closeOrderWithPdf(this.order().id, act.id);
      this.pdfUrl.set(url);
    } catch {
      this.actaError.set(this.transloco.translate('orders.toast.closeError'));
    } finally {
      this.closingOrder.set(false);
    }
  }
}
