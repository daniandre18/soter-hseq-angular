import { Component, computed, inject, linkedSignal, signal, untracked } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { Icon, type IconName } from '../../../../shared/components/icon/icon';
import { ToastService } from '../../../../shared/services/toast.service';
import { ThemeService, type ThemePreference } from '../../../../shared/services/theme.service';
import { SettingsFacade } from '../../facades/settings.facade';
import { LogoUploadField } from '../../components/logo-upload-field/logo-upload-field';
import {
  GeneralSettingsForm,
  type GeneralFormModel,
} from '../../components/general-settings-form/general-settings-form';
import { LOGO_SIZE_RANGE, type LogoAlignment } from '../../../../core/models/app-settings.model';
import { releaseOnDestroy } from '../../../../shared/utils/release-on-destroy';

type SettingsTab = 'general' | 'appearance' | 'ai-prompts' | 'connections' | 'webhooks';

interface TabDef {
  id: SettingsTab;
  icon: IconName;
  translationKey: `settings.tabs.${string}`;
  /** Pestañas sin funcionalidad propia todavía — se muestran para reflejar
   *  el mapa completo de Configuración, pero con un estado "próximamente"
   *  en vez de un formulario que no escribe a ningún lado (ver resumen). */
  comingSoon: boolean;
}

const TABS: TabDef[] = [
  { id: 'general', icon: 'building-2', translationKey: 'settings.tabs.general', comingSoon: false },
  { id: 'appearance', icon: 'settings', translationKey: 'settings.tabs.appearance', comingSoon: false },
  { id: 'ai-prompts', icon: 'message-square', translationKey: 'settings.tabs.aiPrompts', comingSoon: true },
  { id: 'connections', icon: 'external-link', translationKey: 'settings.tabs.connections', comingSoon: true },
  { id: 'webhooks', icon: 'globe', translationKey: 'settings.tabs.webhooks', comingSoon: true },
];
const TAB_ORDER = TABS.map((tab) => tab.id);

const THEME_PREVIEW_OPTIONS: { value: ThemePreference; icon: IconName; translationKey: `theme.${string}` }[] = [
  { value: 'light', icon: 'sun', translationKey: 'theme.light' },
  { value: 'dark', icon: 'moon', translationKey: 'theme.dark' },
  { value: 'semi-dark', icon: 'contrast', translationKey: 'theme.semiDark' },
  { value: 'system', icon: 'monitor', translationKey: 'theme.system' },
];

const ALIGNMENT_OPTIONS: { value: LogoAlignment; icon: IconName }[] = [
  { value: 'left', icon: 'align-left' },
  { value: 'center', icon: 'align-center' },
  { value: 'right', icon: 'align-right' },
];

@Component({
  selector: 'app-settings-page',
  imports: [Card, Button, Icon, LogoUploadField, GeneralSettingsForm, TranslocoPipe],
  providers: [...provideTranslocoScope('settings')],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly settingsFacade = inject(SettingsFacade);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  protected readonly theme = inject(ThemeService);

  protected readonly tabs = TABS;
  protected readonly activeTab = signal<SettingsTab>('general');
  protected readonly themeOptions = THEME_PREVIEW_OPTIONS;
  protected readonly alignmentOptions = ALIGNMENT_OPTIONS;
  protected readonly logoSizeRange = LOGO_SIZE_RANGE;

  protected readonly settings = this.settingsFacade.settings;
  protected readonly loading = this.settingsFacade.loading;

  // `untracked()`: el valor inicial del formulario debe tomarse una sola
  // vez (ver el comentario en `GeneralSettingsForm` sobre por qué ese
  // formulario usa `ReactiveFormsModule` en vez de signal-forms). Sin
  // trackear `settings()`, este `linkedSignal` no se recalcula cada vez que
  // `Sidebar` (que comparte el mismo `SettingsFacade`) dispara un nuevo
  // valor — el formulario no debe "saltar" por debajo de lo que el usuario
  // está escribiendo.
  protected readonly generalFormSeed = linkedSignal<GeneralFormModel>(() => {
    const current = untracked(() => this.settings());
    return {
      businessName: current.businessName,
      tagline: current.tagline ?? '',
      email: current.email ?? '',
      phone: current.phone ?? '',
      address: current.address ?? '',
    };
  });

  protected readonly savingAppearance = signal(false);

  protected readonly appearanceModel = linkedSignal(() => {
    const current = this.settings();
    return {
      logoDesktopSize: current.logoDesktopSize,
      logoMobileSize: current.logoMobileSize,
      logoAlignment: current.logoAlignment,
    };
  });

  constructor() {
    releaseOnDestroy(this.settingsFacade.init());
  }

  protected setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  protected onTabKeydown(event: KeyboardEvent, current: SettingsTab): void {
    const currentIndex = TAB_ORDER.indexOf(current);
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % TAB_ORDER.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = TAB_ORDER.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextTab = TAB_ORDER[nextIndex];
    this.activeTab.set(nextTab);
    document.getElementById(`settings-tab-${nextTab}`)?.focus();
  }

  protected setAlignment(alignment: LogoAlignment): void {
    this.appearanceModel.update((model) => ({ ...model, logoAlignment: alignment }));
  }

  protected setDesktopSize(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.appearanceModel.update((model) => ({ ...model, logoDesktopSize: value }));
  }

  protected setMobileSize(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.appearanceModel.update((model) => ({ ...model, logoMobileSize: value }));
  }

  protected async saveAppearance(): Promise<void> {
    this.savingAppearance.set(true);
    try {
      await this.settingsFacade.updateAppearance(this.appearanceModel());
      this.toast.success(this.transloco.translate('settings.appearance.saveSuccess'));
    } catch {
      this.toast.error(this.transloco.translate('settings.appearance.saveError'));
    } finally {
      this.savingAppearance.set(false);
    }
  }

  protected readonly comingSoonTab = computed(() => this.tabs.find((tab) => tab.id === this.activeTab() && tab.comingSoon));
}
