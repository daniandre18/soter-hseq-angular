import { Component, computed, inject, signal } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Icon } from '../../../../shared/components/icon/icon';
import { ProgressBar } from '../../../../shared/components/progress-bar/progress-bar';
import { Button } from '../../../../shared/components/button/button';
import { ToastService } from '../../../../shared/services/toast.service';
import { SettingsFacade } from '../../facades/settings.facade';
import { ACCEPTED_LOGO_TYPES, MAX_LOGO_SIZE_BYTES } from '../../models/logo-upload.model';
import { environment } from '../../../../../environments/environment';

/** Zona de carga del logo de la empresa — mismo patrón de dropzone/preview/
 *  progreso que `OrderEvidenceCard`, adaptado a un único archivo que se
 *  sube de inmediato al confirmarlo (sin metadatos adicionales). */
@Component({
  selector: 'app-logo-upload-field',
  imports: [Icon, ProgressBar, Button, TranslocoPipe],
  providers: [...provideTranslocoScope('settings')],
  templateUrl: './logo-upload-field.html',
  styleUrl: './logo-upload-field.scss',
})
export class LogoUploadField {
  private readonly settingsFacade = inject(SettingsFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly uploadsEnabled = environment.evidenceUploadsEnabled;
  protected readonly currentLogoUrl = computed(() => this.settingsFacade.settings().logoUrl);
  protected readonly acceptedFilesHelp = `PNG, JPG o SVG · máx. ${Math.round(MAX_LOGO_SIZE_BYTES / 1024 / 1024)} MB · recomendado 200×50px`;

  protected readonly dropzoneActive = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFilePreviewUrl = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly uploading = signal(false);
  protected readonly uploadProgress = signal<number | null>(null);

  private validateFile(file: File): string | null {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      return this.transloco.translate('settings.appearance.logo.typeError');
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return this.transloco.translate('settings.appearance.logo.sizeError', {
        max: Math.round(MAX_LOGO_SIZE_BYTES / 1024 / 1024),
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
    this.selectedFilePreviewUrl.set(file ? URL.createObjectURL(file) : null);
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
      await this.settingsFacade.uploadLogo(file, (percent) => this.uploadProgress.set(percent));
      this.toast.success(this.transloco.translate('settings.appearance.logo.uploadSuccess'));
      this.setSelectedFile(null);
    } catch {
      this.toast.error(this.transloco.translate('settings.appearance.logo.uploadError'));
    } finally {
      this.uploading.set(false);
      this.uploadProgress.set(null);
    }
  }
}
