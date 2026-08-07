import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Injectable()
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private currentSnapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.currentSnapshot) {
        this.updateTitle(this.currentSnapshot);
      }
    });
    this.transloco.events$
      .pipe(
        filter((event) => event.type === 'translationLoadSuccess'),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.currentSnapshot) {
          this.updateTitle(this.currentSnapshot);
        }
      });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.currentSnapshot = snapshot;
    const titleKey = this.buildTitle(snapshot);
    this.title.setTitle(titleKey ? this.transloco.translate(titleKey) : 'SOTER HSEQ');
  }
}
