import { Component, computed, inject, input, output } from '@angular/core';
import { AuthFacade } from '../../features/auth/facades/auth.facade';
import { Avatar } from '../../shared/components/avatar/avatar';
import { USER_ROLE_LABELS } from '../../core/models/user-role.model';

@Component({
  selector: 'app-header',
  imports: [Avatar],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authFacade = inject(AuthFacade);

  readonly title = input('SOTER HSEQ');
  readonly menuClick = output<void>();

  protected readonly currentUser = this.authFacade.currentUser;

  protected readonly roleLabel = computed(() => {
    const role = this.authFacade.currentRole();
    return role ? USER_ROLE_LABELS[role] : '';
  });

  protected openMenu(): void {
    this.menuClick.emit();
  }
}
