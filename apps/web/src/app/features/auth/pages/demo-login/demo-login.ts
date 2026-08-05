import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../../facades/auth.facade';

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
      return;
    }
    this.selectedEmail.set(null);
  }
}
