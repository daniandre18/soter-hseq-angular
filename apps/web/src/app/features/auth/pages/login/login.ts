import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, email, form, minLength, required, submit } from '@angular/forms/signals';
import { AuthFacade } from '../../facades/auth.facade';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { LanguageSelector } from '../../../../shared/components/language-selector/language-selector';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, TranslocoPipe, LanguageSelector],
  providers: [...provideTranslocoScope('auth')],
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
    required(schemaPath.email, { message: 'auth.login.emailRequired' });
    email(schemaPath.email, { message: 'auth.login.emailInvalid' });
    required(schemaPath.password, { message: 'auth.login.passwordRequired' });
    minLength(schemaPath.password, 6, { message: 'auth.login.passwordMinLength' });
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
