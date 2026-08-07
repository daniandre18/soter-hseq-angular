import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../../facades/auth.facade';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { LanguageSelector } from '../../../../shared/components/language-selector/language-selector';
import type { UserRole } from '../../../../core/models/user-role.model';

interface DemoProfile {
  email: string;
  role: UserRole;
  name: string;
  descriptionKey: `demo.profiles.${string}`;
  icon: string;
  color: 'red' | 'blue' | 'purple' | 'orange' | 'green';
}

const DEMO_PASSWORD = '123456';

@Component({
  selector: 'app-demo-login',
  imports: [TranslocoPipe, LanguageSelector],
  providers: [...provideTranslocoScope('auth')],
  templateUrl: './demo-login.html',
  styleUrl: './demo-login.scss',
})
export class DemoLogin {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly profiles: readonly DemoProfile[] = [
    {
      email: 'admin@soterhseq.demo',
      role: 'ADMIN',
      name: 'Carlos Méndez',
      descriptionKey: 'demo.profiles.admin',
      icon: '🛡️',
      color: 'red',
    },
    {
      email: 'comercial@soterhseq.demo',
      role: 'COMMERCIAL',
      name: 'Luisa Fernández',
      descriptionKey: 'demo.profiles.commercial',
      icon: '💼',
      color: 'blue',
    },
    {
      email: 'coordinador@soterhseq.demo',
      role: 'COORDINATOR',
      name: 'Andrés Rojas',
      descriptionKey: 'demo.profiles.coordinator',
      icon: '👥',
      color: 'purple',
    },
    {
      email: 'tecnico1@soterhseq.demo',
      role: 'TECHNICIAN',
      name: 'Andrés Morales',
      descriptionKey: 'demo.profiles.technician',
      icon: '⛑️',
      color: 'orange',
    },
    {
      email: 'cliente@soterhseq.demo',
      role: 'VIEWER',
      name: 'María Torres',
      descriptionKey: 'demo.profiles.client',
      icon: '🏢',
      color: 'green',
    },
  ];

  protected readonly loading = this.authFacade.loading;
  protected readonly authError = this.authFacade.error;
  protected readonly selectedEmail = signal<string | null>(null);
  protected readonly transitioning = signal(false);

  protected async loginAs(profile: DemoProfile): Promise<void> {
    if (this.loading() || this.transitioning()) return;
    this.selectedEmail.set(profile.email);
    this.transitioning.set(true);
    const success = await this.authFacade.login(profile.email, DEMO_PASSWORD);
    if (success) {
      await this.router.navigateByUrl('/');
      return;
    }
    this.selectedEmail.set(null);
    this.transitioning.set(false);
  }
}
