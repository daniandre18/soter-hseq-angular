import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import type { QuillModules } from 'ngx-quill/config';
import Quill, { Module } from 'quill';
import { BlockEmbed } from 'quill/blots/block';
import type Toolbar from 'quill/modules/toolbar';
import type { Blot } from 'parchment';
import { of, switchMap } from 'rxjs';
import { Modal } from '../../../../shared/components/modal/modal';
import { Button } from '../../../../shared/components/button/button';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { ProgressBar } from '../../../../shared/components/progress-bar/progress-bar';
import { AuthFacade } from '../../../auth/facades/auth.facade';
import { OrdersFacade } from '../../facades/orders.facade';
import { ORDER_STATUS_CONFIG } from '../../models/order-status-config';
import { ORDER_PRIORITY_CONFIG } from '../../models/order-priority-config';
import { NOTE_TYPE_LABELS, type NoteType } from '../../models/note.model';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPE,
  EVIDENCE_CATEGORY_LABELS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_PDF_SIZE_BYTES,
  type EvidenceCategory,
} from '../../models/evidence.model';
import { OrderActivityFeed } from '../order-activity-feed/order-activity-feed';
import {
  formatDateTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '../../../../shared/utils/format-date';
import type { OrderStatus, ServiceOrder } from '../../models/order.model';
import type { ClosingActContent } from '../../models/closing-act.model';
import { environment } from '../../../../../environments/environment';

const SCHEDULABLE_STATUSES = new Set<ServiceOrder['status']>(['DRAFT', 'SCHEDULED']);
const ASSIGNABLE_STATUSES = new Set<ServiceOrder['status']>(['SCHEDULED', 'ASSIGNED']);
const CANCELLABLE_STATUSES = new Set<ServiceOrder['status']>(['DRAFT', 'SCHEDULED', 'ASSIGNED']);
const MIN_EVIDENCE_COUNT_FOR_REVIEW = 1;
/**
 * Estados que un cambio manual libre puede fijar. `APPROVED`/`CLOSED` quedan
 * afuera a propósito: solo se alcanzan a través del flujo de acta
 * (`approveClosingAct`/`closeOrderWithPdf`), que deja auditoría y genera el
 * PDF — permitirlos aquí saltaría ese flujo sin dejar rastro.
 */
const FREELY_SETTABLE_STATUSES: OrderStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'EVIDENCE_PENDING',
  'UNDER_REVIEW',
  'CORRECTION_REQUIRED',
  'CANCELLED',
];
type DetailTab = 'info' | 'activity' | 'acta';

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function richTextPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function normalizedRichText(html: string): string | undefined {
  const trimmed = html.trim();
  return richTextPlainText(trimmed) ? trimmed : undefined;
}

/**
 * NOTA: no se usa el paquete npm `quill-upload`. Su `AttachmentHandler` tiene
 * un bug confirmado en el código fuente (v0.0.14): `insertFileToEditor` lee
 * `this.handlerId`, que nunca se asigna en ninguna parte de la librería, así
 * que el adjunto se queda congelado en el placeholder de "cargando" y jamás
 * se reemplaza por el enlace de descarga. Este blot + módulo son una
 * implementación propia, mínima, sobre la API pública de Quill 2.
 */
type AttachmentUploadStatus = 'uploading' | 'done' | 'error';

interface AttachmentBlotValue {
  attachmentId: string;
  fileName: string;
  url: string;
  status: AttachmentUploadStatus;
}

class AttachmentBlot extends BlockEmbed {
  static override blotName = 'attachment';
  static override tagName = 'div';
  static override className = 'ql-attachment';

  static override create(value: AttachmentBlotValue): HTMLElement {
    const node = super.create(value) as HTMLElement;
    node.setAttribute('contenteditable', 'false');
    node.setAttribute('data-attachment-id', value.attachmentId);
    node.setAttribute('data-status', value.status);

    const icon = document.createElement('span');
    icon.className = 'ql-attachment__icon';
    icon.textContent =
      value.status === 'error' ? '⚠️' : value.status === 'uploading' ? '⏳' : '📎';

    const label = document.createElement(value.status === 'done' ? 'a' : 'span');
    label.className = 'ql-attachment__label';
    label.textContent =
      value.status === 'uploading'
        ? `Subiendo ${value.fileName}…`
        : value.status === 'error'
          ? `No se pudo subir ${value.fileName}`
          : value.fileName;

    if (value.status === 'done') {
      label.setAttribute('href', value.url);
      label.setAttribute('target', '_blank');
      label.setAttribute('rel', 'noopener noreferrer');
      label.setAttribute('download', value.fileName);
    }

    node.replaceChildren(icon, label);
    return node;
  }

  static override value(node: HTMLElement): AttachmentBlotValue {
    const label = node.querySelector<HTMLElement>('.ql-attachment__label');
    return {
      attachmentId: node.getAttribute('data-attachment-id') ?? '',
      fileName: label?.textContent ?? '',
      url: label?.getAttribute('href') ?? '',
      status: (node.getAttribute('data-status') as AttachmentUploadStatus | null) ?? 'done',
    };
  }
}

Quill.register(AttachmentBlot);

const attachmentToolbarIcons = Quill.import('ui/icons') as Record<string, string>;
attachmentToolbarIcons['attachment'] =
  '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M12.5 5v6.5a3 3 0 0 1-6 0V4a2 2 0 0 1 4 0v7a1 1 0 0 1-2 0V5"/></svg>';

const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface AttachmentUploadOptions {
  /** Sube el archivo al backend y resuelve con la URL pública/firmada de descarga. */
  upload: (file: File) => Promise<string>;
  /** Mimetypes aceptados; por defecto imágenes + PDF + Excel + Word. */
  acceptedMimeTypes?: string[];
  /** Tamaño máximo por archivo, en bytes. */
  maxFileSizeBytes?: number;
  onError?: (message: string) => void;
}

class AttachmentUploadModule extends Module<AttachmentUploadOptions> {
  private readonly upload: (file: File) => Promise<string>;
  private readonly acceptedMimeTypes: string[];
  private readonly maxFileSizeBytes: number;
  private readonly onUploadError?: (message: string) => void;

  constructor(quill: Quill, options: Partial<AttachmentUploadOptions>) {
    super(quill, options);

    if (typeof options.upload !== 'function') {
      throw new Error('[AttachmentUploadModule] Falta la función "upload".');
    }

    this.upload = options.upload;
    this.acceptedMimeTypes =
      options.acceptedMimeTypes ?? [...ACCEPTED_IMAGE_TYPES, ...DOCUMENT_MIME_TYPES];
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? MAX_PDF_SIZE_BYTES;
    this.onUploadError = options.onError;

    const toolbar = this.quill.getModule('toolbar') as Toolbar | null;
    toolbar?.addHandler('attachment', () => this.selectFile());
  }

  private selectFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.acceptedMimeTypes.join(',');
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0] ?? null;
        if (file) {
          this.handleFile(file);
        }
      },
      { once: true },
    );
    input.click();
  }

  private handleFile(file: File): void {
    if (!this.acceptedMimeTypes.includes(file.type)) {
      this.onUploadError?.(
        `Formato no permitido: "${file.name}". Solo se aceptan PDF, Word, Excel e imágenes.`,
      );
      return;
    }

    if (file.size > this.maxFileSizeBytes) {
      this.onUploadError?.(
        `"${file.name}" supera el tamaño máximo de ${Math.round(this.maxFileSizeBytes / (1024 * 1024))} MB.`,
      );
      return;
    }

    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const range = this.quill.getSelection(true);
    const insertIndex = range ? range.index : this.quill.getLength();
    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    this.quill.insertEmbed(
      insertIndex,
      'attachment',
      { attachmentId, fileName: file.name, url: '', status: 'uploading' } satisfies AttachmentBlotValue,
      'user',
    );
    this.quill.setSelection(insertIndex + 1, 0, 'silent');

    this.upload(file)
      .then((url) => {
        if (isImage) {
          this.replaceWithImage(attachmentId, insertIndex, url);
        } else {
          this.replaceAttachment(attachmentId, insertIndex, {
            attachmentId,
            fileName: file.name,
            url,
            status: 'done',
          });
        }
      })
      .catch((error: unknown) => {
        this.replaceAttachment(attachmentId, insertIndex, {
          attachmentId,
          fileName: file.name,
          url: '',
          status: 'error',
        });
        this.onUploadError?.(
          error instanceof Error ? error.message : `No se pudo subir "${file.name}".`,
        );
      });
  }

  private findBlot(attachmentId: string): Blot | null {
    const node = this.quill.root.querySelector<HTMLElement>(
      `[data-attachment-id="${attachmentId}"]`,
    );
    if (!node) {
      return null;
    }
    const found = Quill.find(node, false);
    return found instanceof Quill ? null : found;
  }

  private replaceAttachment(
    attachmentId: string,
    fallbackIndex: number,
    value: AttachmentBlotValue,
  ): void {
    const blot = this.findBlot(attachmentId);
    const index = blot ? this.quill.getIndex(blot) : fallbackIndex;
    this.quill.deleteText(index, 1, 'silent');
    this.quill.insertEmbed(index, 'attachment', value, 'silent');
  }

  private replaceWithImage(attachmentId: string, fallbackIndex: number, url: string): void {
    const blot = this.findBlot(attachmentId);
    const index = blot ? this.quill.getIndex(blot) : fallbackIndex;
    this.quill.deleteText(index, 1, 'silent');
    this.quill.insertEmbed(index, 'image', url, 'silent');
  }
}

Quill.register('modules/attachmentUpload', AttachmentUploadModule);

@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [
    Modal,
    Button,
    StatusBadge,
    Avatar,
    ProgressBar,
    KeyValuePipe,
    ReactiveFormsModule,
    QuillEditorComponent,
    OrderActivityFeed,
    RouterLink,
  ],
  templateUrl: './order-detail-modal.html',
  styleUrl: './order-detail-modal.scss',
})
export class OrderDetailModal {
  private readonly authFacade = inject(AuthFacade);
  private readonly ordersFacade = inject(OrdersFacade);

  readonly order = input<ServiceOrder | null>(null);
  readonly closeRequested = output<void>();
  readonly editRequested = output<ServiceOrder>();

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

  protected readonly events = toSignal(
    toObservable(this.order).pipe(
      switchMap((order) => (order ? this.ordersFacade.watchOrderEvents(order.id) : of([]))),
    ),
    { initialValue: [] },
  );

  protected readonly resolveAuthorName = (id: string): string => this.ordersFacade.displayNameFor(id);

  protected readonly statusLabel = computed(() => {
    const order = this.order();
    return order ? ORDER_STATUS_CONFIG[order.status].label : '';
  });

  protected readonly statusColor = computed(() => {
    const order = this.order();
    return order ? ORDER_STATUS_CONFIG[order.status].color : 'gray';
  });

  protected readonly priorityLabel = computed(() => {
    const order = this.order();
    return order ? ORDER_PRIORITY_CONFIG[order.priority].label : '';
  });

  protected readonly priorityColor = computed(() => {
    const order = this.order();
    return order ? ORDER_PRIORITY_CONFIG[order.priority].color : 'gray';
  });

  private readonly canManage = computed(() => {
    const role = this.authFacade.currentRole();
    return role === 'ADMIN' || role === 'COORDINATOR';
  });

  /** Igual que "Cancelar Orden": una orden cerrada/cancelada es de solo
   *  lectura salvo administración auditada aparte (CLAUDE.md §10.2). */
  protected readonly canEditOrder = computed(() => {
    const order = this.order();
    return this.canManage() && !!order && order.status !== 'CLOSED' && order.status !== 'CANCELLED';
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

  /** Control genérico de cambio de estado (independiente de los botones de
   *  transición guiada de arriba) — para que admin/coordinador puedan
   *  corregir un estado sin encajar en un flujo específico. */
  protected readonly canChangeStatusFreely = computed(() => {
    const order = this.order();
    return this.canManage() && !!order && order.status !== 'CLOSED';
  });

  protected readonly freelySettableStatuses = FREELY_SETTABLE_STATUSES;
  protected readonly statusOptionLabel = (status: OrderStatus) => ORDER_STATUS_CONFIG[status].label;

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

  protected readonly actExecutiveSummary = linkedSignal(
    () => this.closingAct()?.executiveSummary ?? '',
  );
  protected readonly actActivitiesText = linkedSignal(() =>
    (this.closingAct()?.performedActivities ?? []).join('\n'),
  );
  protected readonly actFindingsText = linkedSignal(() =>
    (this.closingAct()?.findings ?? []).join('\n'),
  );
  protected readonly actRecommendationsText = linkedSignal(() =>
    (this.closingAct()?.recommendations ?? []).join('\n'),
  );
  protected readonly actConclusions = linkedSignal(() => this.closingAct()?.conclusions ?? '');
  protected readonly actLimitations = linkedSignal(() => this.closingAct()?.limitations ?? '');

  protected readonly correctionReason = signal('');
  protected readonly requestingCorrection = signal(false);

  protected readonly statusChangeOpen = signal(false);
  protected readonly statusChangeTarget = linkedSignal<OrderStatus>(
    () => this.order()?.status ?? 'DRAFT',
  );
  protected readonly changingStatus = signal(false);

  protected readonly newNoteType = signal<NoteType>('GENERAL');
  protected readonly newNoteContent = signal('');
  protected readonly addingNote = signal(false);
  protected readonly noteAttachment = signal<File | null>(null);
  protected readonly noteAttachmentError = signal<string | null>(null);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly evidenceUploadsEnabled = environment.evidenceUploadsEnabled;
  protected readonly evidenceCategory = signal<EvidenceCategory | ''>('');
  protected readonly evidenceDescriptionControl = new FormControl('', { nonNullable: true });
  private readonly evidenceDescriptionHtml = toSignal(
    this.evidenceDescriptionControl.valueChanges,
    { initialValue: this.evidenceDescriptionControl.value },
  );
  protected readonly evidenceDescriptionMaxLength = 1500;
  protected readonly evidenceDescriptionTextLength = computed(
    () => richTextPlainText(this.evidenceDescriptionHtml()).length,
  );
  protected readonly attachmentUploadError = signal<string | null>(null);
  protected readonly evidenceEditorModules: QuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote'],
      ['attachment'],
      ['clean'],
    ],
    attachmentUpload: {
      upload: (file: File) => this.uploadEvidenceAttachment(file),
      onError: (message: string) => this.attachmentUploadError.set(message),
    },
  };
  protected readonly evidenceEditorFormats = [
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'blockquote',
    'image',
    'attachment',
  ];
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

  protected readonly progressValue = linkedSignal(() => this.order()?.progress ?? 0);
  protected readonly progressNote = signal('');
  protected readonly savingProgress = signal(false);

  /**
   * Simula la subida de un adjunto del editor de notas técnicas a backend.
   * TODO: reemplazar por la llamada real (Cloud Function / Storage vía
   * EvidenceRepository) cuando exista el endpoint — nunca invocar Storage
   * directamente desde el componente, según la arquitectura del proyecto.
   */
  private uploadEvidenceAttachment(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.05) {
          reject(new Error(`Simulación: falló la subida de "${file.name}".`));
          return;
        }
        const safeName = encodeURIComponent(file.name);
        resolve(`https://storage.example.com/orders/evidence-drafts/${Date.now()}-${safeName}`);
      }, 1200);
    });
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected editOrder(): void {
    const order = this.order();
    if (order) {
      this.editRequested.emit(order);
    }
  }

  protected openStatusChange(): void {
    this.statusChangeOpen.set(true);
  }

  protected closeStatusChange(): void {
    this.statusChangeOpen.set(false);
  }

  protected async confirmStatusChange(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.changingStatus.set(true);
    try {
      await this.ordersFacade.updateStatus(order.id, this.statusChangeTarget());
      this.statusChangeOpen.set(false);
    } finally {
      this.changingStatus.set(false);
    }
  }

  protected onProgressInput(event: Event): void {
    this.progressValue.set(Number((event.target as HTMLInputElement).value));
  }

  protected async saveProgress(): Promise<void> {
    const order = this.order();
    if (!order) {
      return;
    }
    this.savingProgress.set(true);
    try {
      await this.ordersFacade.updateProgress(
        order.id,
        this.progressValue(),
        this.progressNote().trim() || undefined,
      );
      this.progressNote.set('');
    } finally {
      this.savingProgress.set(false);
    }
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

  /** Validación compartida por el input de evidencia y el de adjunto de nota. */
  private validateAttachmentFile(file: File): string | null {
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isPdf = file.type === ACCEPTED_PDF_TYPE;
    if (!isImage && !isPdf) {
      return 'Formato no permitido. Usa JPEG, PNG, WEBP o PDF.';
    }
    const maxSize = isPdf ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (file.size > maxSize) {
      return `El archivo supera el tamaño máximo (${Math.round(maxSize / 1024 / 1024)} MB).`;
    }
    return null;
  }

  protected onNoteAttachmentSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.noteAttachmentError.set(null);
    if (!file) {
      this.noteAttachment.set(null);
      return;
    }
    const error = this.validateAttachmentFile(file);
    if (error) {
      this.noteAttachmentError.set(error);
      this.noteAttachment.set(null);
      return;
    }
    this.noteAttachment.set(file);
  }

  /**
   * Si hay un archivo adjunto, se sube primero como evidencia real (Storage
   * + `orders/{orderId}/evidence`) y luego la nota se crea referenciando su
   * id — la nota es inmutable tras crearse (CLAUDE.md §9.7/`firestore.rules`),
   * así que el vínculo debe fijarse en esta misma operación.
   */
  protected async addNoteSubmit(): Promise<void> {
    const order = this.order();
    const content = this.newNoteContent().trim();
    if (!order || !content) {
      return;
    }
    this.addingNote.set(true);
    try {
      const attachment = this.noteAttachment();
      const attachmentIds = attachment
        ? [await this.ordersFacade.uploadEvidence(order.id, attachment, undefined, undefined)]
        : undefined;
      await this.ordersFacade.addNote(order.id, this.newNoteType(), content, attachmentIds);
      this.newNoteContent.set('');
      this.noteAttachment.set(null);
      this.noteAttachmentError.set(null);
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
    const error = this.validateAttachmentFile(file);
    if (error) {
      this.fileError.set(error);
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
        normalizedRichText(this.evidenceDescriptionControl.value),
        (percent) => this.uploadProgress.set(percent),
      );
      this.selectedFile.set(null);
      this.evidenceCategory.set('');
      this.evidenceDescriptionControl.reset('');
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
