import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { Avatar } from '../../shared/components/avatar/avatar';
import { Icon, type IconName } from '../../shared/components/icon/icon';
import type { UserRole } from '../../core/models/user-role.model';
import { provideTranslocoScope, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SettingsFacade } from '../../features/settings/facades/settings.facade';
import { PushNotificationsFacade } from '../../features/push-notifications/facades/push-notifications.facade';
import { ThemeService } from '../../shared/services/theme.service';
import { ToastService } from '../../shared/services/toast.service';
import { releaseOnDestroy } from '../../shared/utils/release-on-destroy';

const DEFAULT_LOGO_DARK = 'soter-hseq-logo-menu.jpeg';
const DEFAULT_LOGO_LIGHT = 'soter-hseq-logo-light.png';

interface NavItem {
  kind: 'link';
  path: string;
  translationKey: string;
  icon: IconName;
  roles: UserRole[];
}

interface NavGroup {
  kind: 'group';
  id: 'services';
  translationKey: string;
  icon: IconName;
  roles: UserRole[];
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

interface NavSection {
  id: 'primary' | 'commercial' | 'operations';
  translationKey: string;
  entries: NavEntry[];
}

const SERVICES_GROUP: NavGroup = {
  kind: 'group',
  id: 'services',
  translationKey: 'layout.navigation.services',
  icon: 'wrench',
  roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR'],
  children: [
    {
      kind: 'link',
      path: '/servicios',
      translationKey: 'layout.navigation.catalog',
      icon: 'wrench',
      roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR'],
    },
    {
      kind: 'link',
      path: '/servicios/categorias',
      translationKey: 'layout.navigation.categories',
      icon: 'tag',
      roles: ['ADMIN', 'COMMERCIAL'],
    },
  ],
};

// Las secciones reflejan el flujo mental del usuario: primero la operación
// diaria, luego las tareas comerciales y finalmente la administración del
// equipo. Las entradas sin permiso se eliminan junto con su sección vacía.
const NAV_SECTIONS: NavSection[] = [
  {
    id: 'primary',
    translationKey: 'layout.sections.primary',
    entries: [
      {
        kind: 'link',
        path: '/dashboard',
        translationKey: 'layout.navigation.dashboard',
        icon: 'layout-dashboard',
        roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR'],
      },
      {
        kind: 'link',
        path: '/ordenes',
        translationKey: 'layout.navigation.orders',
        icon: 'clipboard-list',
        roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'VIEWER'],
      },
      {
        kind: 'link',
        path: '/mis-ordenes',
        translationKey: 'layout.navigation.myOrders',
        icon: 'hard-hat',
        roles: ['TECHNICIAN'],
      },
      {
        kind: 'link',
        path: '/agenda',
        translationKey: 'layout.navigation.agenda',
        icon: 'calendar-days',
        roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'TECHNICIAN', 'VIEWER'],
      },
    ],
  },
  {
    id: 'commercial',
    translationKey: 'layout.sections.commercial',
    entries: [
      {
        kind: 'link',
        path: '/clientes',
        translationKey: 'layout.navigation.clients',
        icon: 'building-2',
        roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR'],
      },
      {
        kind: 'link',
        path: '/cotizaciones',
        translationKey: 'layout.navigation.quotes',
        icon: 'file-text',
        roles: ['ADMIN', 'COMMERCIAL', 'COORDINATOR', 'VIEWER'],
      },
      SERVICES_GROUP,
    ],
  },
  {
    id: 'operations',
    translationKey: 'layout.sections.operations',
    entries: [
      {
        kind: 'link',
        path: '/usuarios',
        translationKey: 'layout.navigation.users',
        icon: 'users',
        roles: ['ADMIN'],
      },
      {
        kind: 'link',
        path: '/tecnicos',
        translationKey: 'layout.navigation.technicians',
        icon: 'hard-hat',
        roles: ['ADMIN'],
      },
      {
        kind: 'link',
        path: '/configuracion',
        translationKey: 'layout.navigation.settings',
        icon: 'settings',
        roles: ['ADMIN'],
      },
    ],
  },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Avatar, Icon, TranslocoPipe],
  providers: [...provideTranslocoScope('layout')],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly settingsFacade = inject(SettingsFacade);
  private readonly pushFacade = inject(PushNotificationsFacade);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly mobileOpen = input(false);
  readonly closeRequested = output<void>();

  protected readonly collapsed = signal(false);
  protected readonly servicesExpanded = signal(this.router.url.startsWith('/servicios'));
  protected readonly currentUser = this.authFacade.currentUser;
  protected readonly isCollapsed = computed(() => this.collapsed() && !this.mobileOpen());

  protected readonly settings = this.settingsFacade.settings;
  /** `object-position` del logo — reusa el mismo eje que ya usa
   *  `object-fit: contain` en `.sidebar-logo-image` (ver sidebar.scss). */
  protected readonly logoObjectPosition = computed(() => {
    const alignment = this.settings().logoAlignment;
    if (alignment === 'center') {
      return 'center';
    }
    return alignment === 'right' ? 'right center' : 'left center';
  });

  /** El sidebar se ve oscuro (navy) en los temas "Oscuro" y "Semi Dark" —
   *  ver `dark-sidebar-tokens` en `styles.scss`. */
  protected readonly sidebarIsDark = computed(() => this.theme.effectiveTheme() !== 'light');

  /** Sin logo subido por el usuario, el activo por defecto cambia según el
   *  fondo del sidebar: `DEFAULT_LOGO_DARK` trae texto claro pensado para
   *  navy (con blend "screen"); `DEFAULT_LOGO_LIGHT` ya es un PNG con fondo
   *  transparente y tipografía oscura, pensado para un sidebar blanco. */
  protected readonly logoSrc = computed(() => {
    const custom = this.settings().logoUrl;
    if (custom) {
      return custom;
    }
    return this.sidebarIsDark() ? DEFAULT_LOGO_DARK : DEFAULT_LOGO_LIGHT;
  });

  /** El blend "screen" + chip oscuro (ver `.sidebar-logo`/`.sidebar-logo-image`
   *  en sidebar.scss) solo tienen sentido para `DEFAULT_LOGO_DARK`: es el
   *  único activo diseñado para "flotar" sobre un fondo navy. Cualquier logo
   *  subido por el usuario o `DEFAULT_LOGO_LIGHT` ya trae su propio fondo
   *  transparente correcto y debe pintarse normal. */
  protected readonly logoNeedsDarkTreatment = computed(
    () => !this.settings().logoUrl && this.sidebarIsDark(),
  );

  constructor() {
    releaseOnDestroy(this.settingsFacade.init());
  }

  protected readonly navSections = computed(() => {
    const role = this.authFacade.currentRole();
    if (!role) {
      return [];
    }

    const visibleSections: NavSection[] = [];

    for (const section of NAV_SECTIONS) {
      const entries: NavEntry[] = [];

      for (const entry of section.entries) {
        if (!entry.roles.includes(role)) {
          continue;
        }

        if (entry.kind === 'group') {
          const children = entry.children.filter((child) => child.roles.includes(role));
          if (children.length > 0) {
            entries.push({ ...entry, children });
          }
        } else {
          entries.push(entry);
        }
      }

      if (entries.length > 0) {
        visibleSections.push({ ...section, entries });
      }
    }

    return visibleSections;
  });

  protected readonly roleTranslationKey = computed(() => {
    const role = this.authFacade.currentRole();
    return role ? `roles.${role}` : '';
  });

  protected toggleCollapsed(): void {
    this.collapsed.update((collapsed) => !collapsed);
  }

  protected toggleServices(): void {
    if (this.isCollapsed()) {
      this.collapsed.set(false);
      this.servicesExpanded.set(true);
      return;
    }
    this.servicesExpanded.update((expanded) => !expanded);
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected async logout(): Promise<void> {
    await this.authFacade.logout();
    await this.router.navigateByUrl('/login');
  }

  protected readonly pushSupported = this.pushFacade.supported;
  protected readonly pushEnabled = this.pushFacade.enabled;
  protected readonly pushEnabling = this.pushFacade.enabling;

  protected async togglePushNotifications(): Promise<void> {
    if (this.pushEnabled()) {
      await this.pushFacade.disable();
      return;
    }
    await this.pushFacade.enable();
    const error = this.pushFacade.error();
    if (error) {
      this.toast.error(this.transloco.translate('layout.pushNotifications.error'));
    } else {
      this.toast.success(this.transloco.translate('layout.pushNotifications.enabled'));
    }
  }
}
