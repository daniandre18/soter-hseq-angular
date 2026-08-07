import { KeyValuePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Icon } from '../../../../shared/components/icon/icon';
import { ProgressBar } from '../../../../shared/components/progress-bar/progress-bar';
import { Button } from '../../../../shared/components/button/button';
import { ToastService } from '../../../../shared/services/toast.service';
import { OrdersFacade } from '../../facades/orders.facade';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPE,
  EVIDENCE_CATEGORY_TRANSLATION_KEYS,
  MAX_IMAGE_SIZE_BYTES,
  MAX_PDF_SIZE_BYTES,
  type Evidence,
  type EvidenceCategory,
} from '../../models/evidence.model';
import type { ServiceOrder } from '../../models/order.model';
import { environment } from '../../../../../environments/environment';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Grid de evidencia ya cargada + dropzone persistente para subir nuevas
 * (CLAUDE.md §9.6, §23.5). A diferencia del composer del antiguo modal, la
 * descripción es un `<textarea>` plano en vez del editor Quill enriquecido
 * — el mockup de la página no muestra barra de formato y ya no tiene un
 * lugar claro para esa complejidad extra (ver plan de rediseño).
 */
@Component({
  selector: 'app-order-evidence-card',
  imports: [Icon, ProgressBar, Button, TranslocoPipe, KeyValuePipe],
  providers: [...provideTranslocoScope('orders')],
  templateUrl: './order-evidence-card.html',
  styleUrl: './order-evidence-card.scss',
})
export class OrderEvidenceCard {
  private readonly ordersFacade = inject(OrdersFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly order = input.required<ServiceOrder>();
  readonly evidenceList = input<Evidence[]>([]);
  readonly canLog = input(false);

  protected readonly evidenceCategoryLabels = EVIDENCE_CATEGORY_TRANSLATION_KEYS;
  protected readonly evidenceUploadsEnabled = environment.evidenceUploadsEnabled;
  protected readonly acceptedFilesHelp = `JPG, PNG o WEBP · máx. ${Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)} MB — PDF · máx. ${Math.round(MAX_PDF_SIZE_BYTES / 1024 / 1024)} MB`;

  protected readonly dropzoneActive = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFilePreviewUrl = signal<string | null>(null);
  protected readonly selectedFileSizeLabel = computed(() => {
    const file = this.selectedFile();
    return file ? formatFileSize(file.size) : '';
  });
  protected readonly fileError = signal<string | null>(null);
  protected readonly category = signal<EvidenceCategory | ''>('');
  protected readonly description = signal('');
  protected readonly uploading = signal(false);
  protected readonly uploadProgress = signal<number | null>(null);

  private validateFile(file: File): string | null {
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isPdf = file.type === ACCEPTED_PDF_TYPE;
    if (!isImage && !isPdf) {
      return this.transloco.translate('orders.page.evidence.fileTypeError');
    }
    const maxSize = isPdf ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (file.size > maxSize) {
      return this.transloco.translate('orders.page.evidence.fileSizeError', {
        max: Math.round(maxSize / 1024 / 1024),
      });
    }
    return null;
  }

  private setSelectedFile(file: File | null): void {
    const previousUrl = this.selectedFilePreviewUrl();
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    this.selectedFile.set(file);
    this.selectedFilePreviewUrl.set(
      file && ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])
        ? URL.createObjectURL(file)
        : null,
    );
  }

  private tryAssignFile(file: File): void {
    this.fileError.set(null);
    const error = this.validateFile(file);
    if (error) {
      this.fileError.set(error);
      this.setSelectedFile(null);
      return;
    }
    this.setSelectedFile(file);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      this.tryAssignFile(file);
    }
    input.value = '';
  }

  protected clearSelectedFile(): void {
    this.fileError.set(null);
    this.setSelectedFile(null);
  }

  protected onDropzoneDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dropzoneActive.set(true);
  }

  protected onDropzoneDragLeave(): void {
    this.dropzoneActive.set(false);
  }

  protected onDropzoneDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropzoneActive.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) {
      this.tryAssignFile(file);
    }
  }

  protected async upload(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.uploadProgress.set(0);
    try {
      await this.ordersFacade.uploadEvidence(
        this.order().id,
        file,
        this.category() || undefined,
        this.description().trim() || undefined,
        (percent) => this.uploadProgress.set(percent),
      );
      this.toast.success(this.transloco.translate('orders.toast.evidenceUploaded'));
      this.setSelectedFile(null);
      this.category.set('');
      this.description.set('');
    } catch {
      this.toast.error(this.transloco.translate('orders.toast.evidenceError'));
    } finally {
      this.uploading.set(false);
      this.uploadProgress.set(null);
    }
  }
}
