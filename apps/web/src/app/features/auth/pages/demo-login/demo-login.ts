import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../../facades/auth.facade';
import { BrowserReloadService } from '../../../../core/services/browser-reload.service';

interface DemoProfile {
  email: string;
  role: string;
  name: string;
  description: string;
  icon: string;
  color: 'red' | 'blue' | 'purple' | 'orange';
}

const DEMO_PASSWORD = '123456';

@Component({
  selector: 'app-demo-login',
  imports: [],
  templateUrl: './demo-login.html',
  styleUrl: './demo-login.scss',
})
export class DemoLogin {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly browserReload = inject(BrowserReloadService);

  protected readonly profiles: readonly DemoProfile[] = [
    {
      email: 'admin@soterhseq.demo',
      role: 'Administrador',
      name: 'Carlos Méndez',
      description: 'Acceso total: clientes, órdenes, técnicos, reportes y configuración.',
      icon: '🛡️',
      color: 'red',
    },
    {
      email: 'comercial@soterhseq.demo',
      role: 'Comercial',
      name: 'Luisa Fernández',
      description: 'Gestiona clientes, servicios, cotizaciones y nuevas órdenes.',
      icon: '💼',
      color: 'blue',
    },
    {
      email: 'coordinador@soterhseq.demo',
      role: 'Coordinador',
      name: 'Andrés Rojas',
      description: 'Asigna órdenes, programa visitas y supervisa la operación.',
      icon: '👥',
      color: 'purple',
    },
    {
      email: 'tecnico1@soterhseq.demo',
      role: 'Técnico',
      name: 'Andrés Morales',
      description: 'Consulta sus órdenes, registra avances, notas y hallazgos.',
      icon: '⛑️',
      color: 'orange',
    },
  ];

  protected readonly loading = this.authFacade.loading;
  protected readonly authError = this.authFacade.error;
  protected readonly selectedEmail = signal<string | null>(null);

  protected async loginAs(profile: DemoProfile): Promise<void> {
    if (this.loading()) return;
    this.selectedEmail.set(profile.email);
    const success = await this.authFacade.login(profile.email, DEMO_PASSWORD);
    if (success) {
      await this.router.navigateByUrl('/');
      // En producción Firestore puede tardar un instante en sincronizar el
      // token recién creado con sus listeners. La navegación deja la URL en
      // el destino correcto y esta única recarga arranca esos listeners con
      // la sesión ya persistida. No puede formar un bucle: solo se ejecuta
      // como consecuencia directa de un nuevo clic de acceso exitoso.
      this.browserReload.reload();
      return;
    }
    this.selectedEmail.set(null);
  }
}
