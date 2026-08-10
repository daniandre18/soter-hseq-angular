import { Component, type OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { ToastService } from '../../../../shared/services/toast.service';
import { SettingsFacade } from '../../facades/settings.facade';

export interface GeneralFormModel {
  businessName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
}

/**
 * Usa `ReactiveFormsModule` clásico (no `@angular/forms/signals`) a
 * propósito: con signal-forms, el field graph interno de `form()` se
 * corrompe (`this.field is not a function` en runtime) apenas coexiste con
 * `Sidebar` — ambos inyectan el mismo `SettingsFacade` (`providedIn:
 * 'root'`) y consumen `settings()` al mismo tiempo. Confirmado con una
 * reproducción mínima: el mismo formulario, aislado de `Sidebar`, nunca
 * falla; agregar `Sidebar` a la misma página lo rompe de forma
 * consistente, incluso con el modelo completamente desacoplado vía
 * `untracked()`. `@angular/forms/signals` es una API nueva de Angular 22
 * (`@publicApi 22.0`) — Reactive Forms clásico no tiene esta fragilidad.
 */
@Component({
  selector: 'app-general-settings-form',
  imports: [Card, Button, ReactiveFormsModule, TranslocoPipe],
  providers: [...provideTranslocoScope('settings')],
  templateUrl: './general-settings-form.html',
  styleUrl: './general-settings-form.scss',
})
export class GeneralSettingsForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsFacade = inject(SettingsFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly seed = input.required<GeneralFormModel>();

  protected readonly saving = signal(false);
  // Angular garantiza `input.required()` resuelto recién en `ngOnInit`, no
  // en el constructor (NG0950 si se lee antes) — se arma ahí, no en un
  // inicializador de campo.
  protected form!: ReturnType<GeneralSettingsForm['buildForm']>;

  ngOnInit(): void {
    this.form = this.buildForm();
  }

  private buildForm() {
    const seed = this.seed();
    return this.fb.nonNullable.group({
      businessName: [seed.businessName, Validators.required],
      tagline: [seed.tagline],
      email: [seed.email],
      phone: [seed.phone],
      address: [seed.address],
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    void this.doSave();
  }

  private async doSave(): Promise<void> {
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      await this.settingsFacade.updateGeneral({
        businessName: value.businessName,
        tagline: value.tagline || undefined,
        email: value.email || undefined,
        phone: value.phone || undefined,
        address: value.address || undefined,
      });
      this.toast.success(this.transloco.translate('settings.general.saveSuccess'));
    } catch {
      this.toast.error(this.transloco.translate('settings.general.saveError'));
    } finally {
      this.saving.set(false);
    }
  }
}
