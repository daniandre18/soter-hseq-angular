import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';

const DEFAULT_TITLE = 'SOTER HSEQ';

function deepestTitle(route: ActivatedRoute): string {
  let current = route;
  while (current.firstChild) {
    current = current.firstChild;
  }
  // `snapshot` puede no estar disponible aún si se lee durante la
  // construcción síncrona del Shell, antes de que el Router termine de
  // resolver la ruta hija — de ahí el optional chaining defensivo.
  return (current.snapshot?.data?.['title'] as string | undefined) ?? DEFAULT_TITLE;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly mobileNavOpen = signal(false);

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => deepestTitle(this.activatedRoute)),
    ),
    { initialValue: DEFAULT_TITLE },
  );

  protected openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
