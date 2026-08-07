import { Component, inject } from '@angular/core';
import { Icon } from '../icon/icon';
import { ToastService } from '../../services/toast.service';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-toast-container',
  imports: [Icon, TranslocoPipe],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
})
export class ToastContainer {
  protected readonly toast = inject(ToastService);

  protected dismiss(id: number): void {
    this.toast.dismiss(id);
  }
}
