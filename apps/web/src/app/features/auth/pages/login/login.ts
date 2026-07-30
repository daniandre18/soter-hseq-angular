import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, email, form, minLength, required, submit } from '@angular/forms/signals';
import { AuthFacade } from '../../facades/auth.facade';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly model = signal({
    email: '',
    password: '',
  });

  protected readonly loginForm = form(this.model, (schemaPath) => {
    required(schemaPath.email, { message: 'El correo es obligatorio.' });
    email(schemaPath.email, { message: 'Ingresa un correo válido.' });
    required(schemaPath.password, { message: 'La contraseña es obligatoria.' });
    minLength(schemaPath.password, 6, { message: 'Debe tener al menos 6 caracteres.' });
  });

  protected readonly loading = this.authFacade.loading;
  protected readonly authError = this.authFacade.error;

  protected onSubmit(): void {
    submit(this.loginForm, async () => {
      const success = await this.authFacade.login(this.model().email, this.model().password);
      if (success) {
        // La ruta raíz decide el destino real según el rol (homeRedirectGuard):
        // no todos los roles pueden ver el Panel (p. ej. un técnico).
        await this.router.navigateByUrl('/');
      }
    });
  }
}
