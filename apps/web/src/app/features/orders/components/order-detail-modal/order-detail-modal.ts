import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { OrdersFacade } from '../../facades/orders.facade';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { NOTE_TYPE_LABELS, type NoteType } from '../../models/note.model';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPE,
  EVIDENCE_CATEGORY_LABELS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_PDF_SIZE_BYTES,
  type EvidenceCategory,
} from '../../models/evidence.model';
import {
  formatDateTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '../../../../shared/utils/format-date';
import type { ServiceOrder } from '../../models/order.model';
import type { ClosingActContent } from '../../models/closing-act.model';

const SCHEDULABLE_STATUSES = new Set<ServiceOrder['status']>(['DRAFT', 'SCHEDULED']);
const ASSIGNABLE_STATUSES = new Set<ServiceOrder['status']>(['SCHEDULED', 'ASSIGNED']);
const CANCELLABLE_STATUSES = new Set<ServiceOrder['status']>(['DRAFT', 'SCHEDULED', 'ASSIGNED']);
const MIN_EVIDENCE_COUNT_FOR_REVIEW = 1;
type DetailTab = 'info' | 'log' | 'evidence' | 'acta';

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

@Component({
  selector: 'app-order-detail-modal',
  imports: [Modal, Button, StatusBadge, Avatar, KeyValuePipe],
  templateUrl: './order-detail-modal.html',
  styleUrl: './order-detail-modal.scss',
})
export class OrderDetailModal {
  private readonly authFacade = inject(AuthFacade);
  private readonly ordersFacade = inject(OrdersFacade);

  readonly order = input<ServiceOrder | null>(null);
  readonly closeRequested = output<void>();

  protected readonly saving = signal(false);
  protected readonly formatDateTime = formatDateTime;
  protected readonly technicians = this.ordersFacade.technicians;
  protected readonly noteTypeLabels = NOTE_TYPE_LABELS;
  protected readonly evidenceCategoryLabels = EVIDENCE_CATEGORY_LABELS;

  protected readonly activeTab = signal<DetailTab>('info');

  protected readonly notes = toSignal(
    toObservable(this.order).pipe(
      switchMap((order) => (order ? this.ordersFacade.watchNotes(order.id) : of([]))),
    ),
    { initialValue: [] },
  );

  protected readonly evidenceList = toSignal(
    toObservable(this.order).pipe(
      switchMap((order) => (order ? this.ordersFacade.watchEvidence(order.id) : of([]))),
    ),
    { initialValue: [] },
  );

  protected readonly closingAct = toSignal(
    toObservable(this.order).pipe(
      switchMap((order) => (order ? this.ordersFacade.watchClosingAct(order.id) : of(null))),
    ),
    { initialValue: null },
  );

  protected readonly statusLabel = computed(() => {
    const order = this.order();
    return order ? ORDER_STATUS_CONFIG[order.status].label : '';
  });

  protected readonly statusColor = computed(() => {
    const order = this.order();
    return order ? ORDER_STATUS_CONFIG[order.status].color : 'gray';
  });

  private readonly canManage = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COORDINATOR';
  });

  protected readonly canSchedule = computed(
    () => this.canManage() && !!this.order() && SCHEDULABLE_STATUSES.has(this.order()!.status),
  );

  protected readonly canAssign = computed(
    () => this.canManage() && !!this.order() && ASSIGNABLE_STATUSES.has(this.order()!.status),
  );

  protected readonly canCancel = computed(
    () => this.canManage() && !!this.order() && CANCELLABLE_STATUSES.has(this.order()!.status),
  );

  protected readonly canExecute = computed(() => {
    const order = this.order();
    const uid = this.authFacade.currentUser()?.id;
    return (
      !!order &&
      this.authFacade.currentRole() === 'TECHNICIAN' &&
      !!uid &&
      order.assignedTechnicianIds.includes(uid) &&
      order.status === 'ASSIGNED'
    );
  });

  protected readonly assignedTechnicianNames = computed(() =>
    (this.order()?.assignedTechnicianIds ?? []).map((id) => this.ordersFacade.technicianName(id)),
  );

  /** Quién puede registrar notas/evidencia (CLAUDE.md §3.3/§3.4): no COMMERCIAL,
   *  y nunca sobre una orden cerrada (§23.5 "bloquear cargas en órdenes cerradas"). */
  protected readonly canLog = computed(() => {
    const order = this.order();
    const role = this.authFacade.currentRole();
    return (
      !!order &&
      order.status !== 'CLOSED' &&
      (role === 'ADMIN' || role === 'COORDINATOR' || role === 'TECHNICIAN')
    );
  });

  /** Cubre tanto el primer envío (IN_PROGRESS) como el reenvío tras una
   *  corrección (CORRECTION_REQUIRED) — misma transición hacia UNDER_REVIEW. */
  protected readonly canSendToReview = computed(() => {
    const order = this.order();
    const uid = this.authFacade.currentUser()?.id;
    return (
      !!order &&
      this.authFacade.currentRole() === 'TECHNICIAN' &&
      !!uid &&
      order.assignedTechnicianIds.includes(uid) &&
      (order.status === 'IN_PROGRESS' || order.status === 'CORRECTION_REQUIRED')
    );
  });

  protected readonly sendToReviewLabel = computed(() =>
    this.order()?.status === 'CORRECTION_REQUIRED' ? 'Reenviar a Revisión' : 'Enviar a Revisión',
  );

  /** Coordinador/admin devuelven la orden a campo (CLAUDE.md §3.3 "solicitar
   *  correcciones"). */
  protected readonly canRequestCorrection = computed(
    () => this.canManage() && this.order()?.status === 'UNDER_REVIEW',
  );

  /** Explica por qué "Enviar a Revisión" está deshabilitado (CLAUDE.md §10.2:
   *  no enviar a revisión sin notas ni sin evidencia mínima). `null` = listo. */
  protected readonly sendToReviewBlockedReason = computed(() => {
    if (this.notes().length === 0) {
      return 'Registra al menos una nota antes de enviar a revisión.';
    }
    if (this.evidenceList().length < MIN_EVIDENCE_COUNT_FOR_REVIEW) {
      return 'Sube al menos una evidencia antes de enviar a revisión.';
    }
    return null;
  });

  protected readonly canRequestActa = computed(
    () => this.canLog() && this.order()?.status === 'UNDER_REVIEW' && !this.closingAct(),
  );

  protected readonly canEditActa = computed(() => {
    const act = this.closingAct();
    return this.canManage() && !!act && act.status !== 'APPROVED' && act.status !== 'FINAL';
  });

  protected readonly canApproveActa = computed(() => {
    const act = this.closingAct();
    return this.canManage() && !!act && act.status !== 'APPROVED' && act.status !== 'FINAL';
  });

  protected readonly canCloseOrder = computed(() => {
    const act = this.closingAct();
    return this.canManage() && !!act && act.status === 'APPROVED';
  });

  protected readonly generatingActa = signal(false);
  protected readonly savingActa = signal(false);
  protected readonly approvingActa = signal(false);
  protected readonly closingOrder = signal(false);
  protected readonly pdfUrl = signal<string | null>(null);
  protected readonly actaError = signal<string | null>(null);

  protected readonly actExecutiveSummary = linkedSignal(() => this.closingAct()?.executiveSummary ?? '');
  protected readonly actActivitiesText = linkedSignal(() =>
    (this.closingAct()?.performedActivities ?? []).join('\n'),
  );
  protected readonly actFindingsText = linkedSignal(() => (this.closingAct()?.findings ?? []).join('\n'));
  protected readonly actRecommendationsText = linkedSignal(() =>
    (this.closingAct()?.recommendations ?? []).join('\n'),
  );
  protected readonly actConclusions = linkedSignal(() => this.closingAct()?.conclusions ?? '');
  protected readonly actLimitations = linkedSignal(() => this.closingAct()?.limitations ?? '');

  protected readonly correctionReason = signal('');
  protected readonly requestingCorrection = signal(false);

  protected readonly newNoteType = signal<NoteType>('GENERAL');
  protected readonly newNoteContent = signal('');
  protected readonly addingNote = signal(false);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly evidenceCategory = signal<EvidenceCategory | ''>('');
  protected readonly evidenceDescription = signal('');
  protected readonly fileError = signal<string | null>(null);
  protected readonly uploadProgress = signal<number | null>(null);
  protected readonly uploading = signal(false);

  protected readonly scheduledStartValue = linkedSignal(() => {
    const order = this.order();
    return order?.scheduledStart ? toDateTimeLocalValue(order.scheduledStart) : '';
  });

  protected readonly scheduledEndValue = linkedSignal(() => {
    const order = this.order();
    return order?.scheduledEnd ? toDateTimeLocalValue(order.scheduledEnd) : '';
  });

  protected readonly selectedTechnicianIds = linkedSignal<string[]>(
    () => this.order()?.assignedTechnicianIds ?? [],
  );

  protected close(): void {
    this.closeRequested.emit();
  }

  protected onScheduledStartInput(event: Event): void {
    this.scheduledStartValue.set((event.target as HTMLInputElement).value);
  }

  protected onScheduledEndInput(event: Event): void {
    this.scheduledEndValue.set((event.target as HTMLInputElement).value);
  }

  protected toggleTechnician(technicianId: string, checked: boolean): void {
    this.selectedTechnicianIds.update((ids) =>
      checked ? [...ids, technicianId] : ids.filter((id) => id !== technicianId),
    );
  }

  protected async saveSchedule(): Promise<void> {
    const order = this.order();
    const start = fromDateTimeLocalValue(this.scheduledStartValue());
    const end = fromDateTimeLocalValue(this.scheduledEndValue());
    if (!order || !start || !end) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.schedule(order.id, start, end);
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveAssignment(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.assignTechnicians(order.id, this.selectedTechnicianIds());
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancelOrder(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.updateStatus(order.id, 'CANCELLED');
      this.close();
    } finally {
      this.saving.set(false);
    }
  }

  protected async startExecution(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.updateStatus(order.id, 'IN_PROGRESS');
      this.close();
    } finally {
      this.saving.set(false);
    }
  }

  protected async sendToReview(): Promise<void> {
    const order = this.order();
    if (!order || this.sendToReviewBlockedReason()) {
      return;
    }
    this.saving.set(true);
    try {
      await this.ordersFacade.updateStatus(order.id, 'UNDER_REVIEW');
      this.close();
    } finally {
      this.saving.set(false);
    }
  }

  protected async requestCorrectionSubmit(): Promise<void> {
    const order = this.order();
    const reason = this.correctionReason().trim();
    if (!order || !reason) {
      return;
    }
    this.requestingCorrection.set(true);
    try {
      await this.ordersFacade.requestCorrection(order.id, reason);
      this.correctionReason.set('');
    } finally {
      this.requestingCorrection.set(false);
    }
  }

  protected setActiveTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  protected async addNoteSubmit(): Promise<void> {
    const order = this.order();
    const content = this.newNoteContent().trim();
    if (!order || !content) {
      return;
    }
    this.addingNote.set(true);
    try {
      await this.ordersFacade.addNote(order.id, this.newNoteType(), content);
      this.newNoteContent.set('');
    } finally {
      this.addingNote.set(false);
    }
  }

  protected onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.fileError.set(null);
    if (!file) {
      this.selectedFile.set(null);
      return;
    }

    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isPdf = file.type === ACCEPTED_PDF_TYPE;
    if (!isImage && !isPdf) {
      this.fileError.set('Formato no permitido. Usa JPEG, PNG, WEBP o PDF.');
      this.selectedFile.set(null);
      return;
    }
    const maxSize = isPdf ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (file.size > maxSize) {
      this.fileError.set(`El archivo supera el tamaño máximo (${Math.round(maxSize / 1024 / 1024)} MB).`);
      this.selectedFile.set(null);
      return;
    }
    this.selectedFile.set(file);
  }

  protected async uploadSelectedFile(): Promise<void> {
    const order = this.order();
    const file = this.selectedFile();
    if (!order || !file) {
      return;
    }
    this.uploading.set(true);
    this.uploadProgress.set(0);
    try {
      await this.ordersFacade.uploadEvidence(
        order.id,
        file,
        this.evidenceCategory() || undefined,
        this.evidenceDescription().trim() || undefined,
        (percent) => this.uploadProgress.set(percent),
      );
      this.selectedFile.set(null);
      this.evidenceCategory.set('');
      this.evidenceDescription.set('');
    } finally {
      this.uploading.set(false);
      this.uploadProgress.set(null);
    }
  }

  protected async generateActa(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.generatingActa.set(true);
    this.actaError.set(null);
    try {
      const summary = this.ordersFacade.buildNotesSummary(order, this.notes());
      await this.ordersFacade.generateClosingActDraft(order.id, summary);
    } catch (error) {
      this.actaError.set(messageFor(error, 'No se pudo generar el borrador con IA.'));
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
    } catch (error) {
      this.actaError.set(messageFor(error, 'No se pudieron guardar los cambios del acta.'));
    } finally {
      this.savingActa.set(false);
    }
  }

  protected async approveActa(): Promise<void> {
    const order = this.order();
    const act = this.closingAct();
    if (!order || !act) {
      return;
    }
    this.approvingActa.set(true);
    this.actaError.set(null);
    try {
      await this.ordersFacade.approveClosingAct(act.id, order.id);
    } catch (error) {
      this.actaError.set(messageFor(error, 'No se pudo aprobar el acta.'));
    } finally {
      this.approvingActa.set(false);
    }
  }

  protected async closeOrderAndGeneratePdf(): Promise<void> {
    const order = this.order();
    const act = this.closingAct();
    if (!order || !act) {
      return;
    }
    this.closingOrder.set(true);
    this.actaError.set(null);
    try {
      const url = await this.ordersFacade.closeOrderWithPdf(order.id, act.id);
      this.pdfUrl.set(url);
    } catch (error) {
      this.actaError.set(messageFor(error, 'No se pudo cerrar la orden ni generar el PDF.'));
    } finally {
      this.closingOrder.set(false);
    }
  }

  protected async viewExistingPdf(): Promise<void> {
    const path = this.closingAct()?.pdfPath;
    if (!path) {
      return;
    }
    const url = this.pdfUrl() ?? (await this.ordersFacade.resolvePdfUrl(path));
    this.pdfUrl.set(url);
    window.open(url, '_blank', 'noopener');
  }
}
