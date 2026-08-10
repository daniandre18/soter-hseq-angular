import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { OrdersFacade } from '../../facades/orders.facade';
import type { ClosingAct, ClosingActContent } from '../../models/closing-act.model';
import type { TechnicalNote } from '../../models/note.model';
import type { ServiceOrder } from '../../models/order.model';

type ActCreationMode = 'MANUAL' | 'AI' | 'UPLOAD';
const MAX_ACT_FILE_SIZE = 10 * 1024 * 1024;

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
  imports: [Button, Icon, StatusBadge, TranslocoPipe],
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
  protected readonly creatingManualAct = signal(false);
  protected readonly uploadingAct = signal(false);
  protected readonly uploadProgress = signal(0);
  protected readonly savingActa = signal(false);
  protected readonly approvingActa = signal(false);
  protected readonly closingOrder = signal(false);
  protected readonly pdfUrl = signal<string | null>(null);
  protected readonly actaError = signal<string | null>(null);
  protected readonly creationMode = signal<ActCreationMode | null>(null);
  protected readonly selectedActFile = signal<File | null>(null);

  protected readonly actObjective = linkedSignal(() => this.closingAct()?.objective ?? '');
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
  protected readonly actAcceptanceNotes = linkedSignal(
    () => this.closingAct()?.acceptanceNotes ?? '',
  );
  protected readonly actServiceProviderRepresentative = linkedSignal(
    () => this.closingAct()?.serviceProviderRepresentative ?? '',
  );
  protected readonly actServiceProviderRepresentativeRole = linkedSignal(
    () => this.closingAct()?.serviceProviderRepresentativeRole ?? '',
  );
  protected readonly actClientRepresentative = linkedSignal(
    () => this.closingAct()?.clientRepresentative ?? '',
  );
  protected readonly actClientRepresentativeRole = linkedSignal(
    () => this.closingAct()?.clientRepresentativeRole ?? '',
  );

  protected readonly canSubmitManualAct = computed(
    () =>
      this.actExecutiveSummary().trim().length >= 10 &&
      linesToArray(this.actActivitiesText()).length > 0 &&
      !this.creatingManualAct(),
  );

  protected selectCreationMode(mode: ActCreationMode): void {
    this.creationMode.set(mode);
    this.actaError.set(null);
    if (mode !== 'MANUAL') {
      return;
    }
    const order = this.order();
    if (!this.actObjective().trim()) {
      this.actObjective.set(
        `Dejar constancia de la ejecución y cierre del servicio ${order.serviceSummary}.`,
      );
    }
    if (!this.actExecutiveSummary().trim()) {
      this.actExecutiveSummary.set(
        `Se deja constancia de la ejecución del servicio asociado a la orden ${order.orderNumber} para ${order.clientBusinessName}.`,
      );
    }
    if (!this.actActivitiesText().trim() && this.notes().length > 0) {
      this.actActivitiesText.set(this.notes().map((note) => note.content).join('\n'));
    }
    if (!this.actServiceProviderRepresentative().trim()) {
      this.actServiceProviderRepresentative.set(
        order.assignedTechnicianNames?.join(', ') || '',
      );
    }
  }

  protected cancelCreation(): void {
    this.creationMode.set(null);
    this.selectedActFile.set(null);
    this.uploadProgress.set(0);
    this.actaError.set(null);
  }

  private buildActContent(): ClosingActContent {
    return {
      objective: this.actObjective().trim() || undefined,
      executiveSummary: this.actExecutiveSummary().trim(),
      performedActivities: linesToArray(this.actActivitiesText()),
      findings: linesToArray(this.actFindingsText()),
      recommendations: linesToArray(this.actRecommendationsText()),
      conclusions: this.actConclusions().trim() || undefined,
      limitations: this.actLimitations().trim() || undefined,
      acceptanceNotes: this.actAcceptanceNotes().trim() || undefined,
      serviceProviderRepresentative:
        this.actServiceProviderRepresentative().trim() || undefined,
      serviceProviderRepresentativeRole:
        this.actServiceProviderRepresentativeRole().trim() || undefined,
      clientRepresentative: this.actClientRepresentative().trim() || undefined,
      clientRepresentativeRole: this.actClientRepresentativeRole().trim() || undefined,
    };
  }

  protected async createManualAct(): Promise<void> {
    if (!this.canSubmitManualAct()) {
      return;
    }
    this.creatingManualAct.set(true);
    this.actaError.set(null);
    try {
      await this.ordersFacade.createManualClosingAct(this.order().id, this.buildActContent());
    } catch {
      this.actaError.set(this.transloco.translate('orders.toast.manualActError'));
    } finally {
      this.creatingManualAct.set(false);
    }
  }

  protected onActFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.actaError.set(null);
    this.uploadProgress.set(0);
    if (!file) {
      this.selectedActFile.set(null);
      return;
    }
    if (
      !file.name.toLocaleLowerCase().endsWith('.pdf') ||
      (file.type !== '' && file.type !== 'application/pdf')
    ) {
      this.selectedActFile.set(null);
      this.actaError.set(this.transloco.translate('orders.report.uploadTypeError'));
      input.value = '';
      return;
    }
    if (file.size > MAX_ACT_FILE_SIZE) {
      this.selectedActFile.set(null);
      this.actaError.set(this.transloco.translate('orders.report.uploadSizeError'));
      input.value = '';
      return;
    }
    this.selectedActFile.set(file);
  }

  protected async uploadAct(): Promise<void> {
    const file = this.selectedActFile();
    if (!file) {
      return;
    }
    this.uploadingAct.set(true);
    this.actaError.set(null);
    try {
      await this.ordersFacade.uploadClosingAct(this.order().id, file, (progress) =>
        this.uploadProgress.set(progress),
      );
    } catch {
      this.actaError.set(this.transloco.translate('orders.toast.uploadActError'));
    } finally {
      this.uploadingAct.set(false);
    }
  }

  protected formatFileSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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
    const content = this.buildActContent();
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
