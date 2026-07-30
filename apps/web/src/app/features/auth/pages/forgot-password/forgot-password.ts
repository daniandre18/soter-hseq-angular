import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { AuthFacade } from '../../facades/auth.facade';

@Component({
  selector: 'app-forgot-password',
  imports: [FormField, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly authFacade = inject(AuthFacade);

  protected readonly model = signal({ email: '' });

  protected readonly resetForm = form(this.model, (schemaPath) => {
    required(schemaPath.email, { message: 'El correo es obligatorio.' });
    email(schemaPath.email, { message: 'Ingresa un correo válido.' });
  });

  protected readonly loading = this.authFacade.loading;
  protected readonly authError = this.authFacade.error;
  protected readonly sent = signal(false);

  protected onSubmit(): void {
    submit(this.resetForm, async () => {
      const success = await this.authFacade.resetPassword(this.model().email);
      this.sent.set(success);
    });
  }
}
