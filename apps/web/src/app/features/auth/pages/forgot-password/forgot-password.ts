import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { AuthFacade } from '../../facades/auth.facade';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { LanguageSelector } from '../../../../shared/components/language-selector/language-selector';

@Component({
  selector: 'app-forgot-password',
  imports: [FormField, RouterLink, TranslocoPipe, LanguageSelector],
  providers: [...provideTranslocoScope('auth')],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly authFacade = inject(AuthFacade);

  protected readonly model = signal({ email: '' });

  protected readonly resetForm = form(this.model, (schemaPath) => {
    required(schemaPath.email, { message: 'auth.login.emailRequired' });
    email(schemaPath.email, { message: 'auth.login.emailInvalid' });
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
