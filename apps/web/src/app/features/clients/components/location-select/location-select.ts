import { Component, computed, effect, input, model, signal, untracked } from '@angular/core';
import { provideTranslocoScope, TranslocoPipe } from '@jsverse/transloco';
import { Combobox, type ComboboxOption } from '../../../../shared/components/combobox/combobox';

/** Forma de `public/data/co-locations.json` (generado por
 *  `scripts/fetch-co-locations.ts` a partir del DIVIPOLA de datos.gov.co). */
interface ColombiaCity {
  code: string;
  name: string;
}

interface ColombiaDepartment {
  code: string;
  name: string;
  cities: ColombiaCity[];
}

let nextInstanceId = 0;

/**
 * Selector de ubicación en cascada (Departamento → Ciudad/Municipio) para
 * Colombia, con búsqueda integrada en ambos combos.
 *
 * El catálogo completo (33 departamentos, ~1122 municipios, DIVIPOLA) vive
 * en `public/data/co-locations.json` — un archivo estático generado una
 * sola vez con `npm run fetch:co-locations` (ver ese script para la fuente
 * y cómo refrescarlo), nunca se llama a una API externa en producción. Se
 * pide con `fetch()` la primera vez que se usa este componente en la
 * sesión, no en el bundle inicial: ~41 KB que ningún otro flujo de la app
 * necesita paga su propio costo solo cuando alguien abre este formulario.
 */
@Component({
  selector: 'app-location-select',
  imports: [Combobox, TranslocoPipe],
  providers: [...provideTranslocoScope('clients')],
  templateUrl: './location-select.html',
  styleUrl: './location-select.scss',
})
export class LocationSelect {
  readonly department = model<string>('');
  readonly city = model<string>('');
  readonly disabled = input(false);

  private readonly instanceId = nextInstanceId++;
  protected readonly departmentInputId = `location-department-${this.instanceId}`;
  protected readonly cityInputId = `location-city-${this.instanceId}`;

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly departments = signal<readonly ColombiaDepartment[]>([]);

  protected readonly departmentOptions = computed<ComboboxOption[]>(() =>
    this.departments().map((entry) => ({ value: entry.name, label: entry.name })),
  );

  protected readonly cityOptions = computed<ComboboxOption[]>(() => {
    const department = this.departments().find((entry) => entry.name === this.department());
    return (department?.cities ?? []).map((city) => ({ value: city.name, label: city.name }));
  });

  protected readonly cityDisabled = computed(
    () => this.disabled() || this.loading() || !this.department(),
  );

  constructor() {
    void this.loadCatalog();

    // Si cambia el departamento y la ciudad ya elegida no pertenece a él
    // (p. ej. el usuario cambió de opinión), se limpia — pero solo una vez
    // cargado el catálogo, para no descartar una ciudad válida mientras el
    // JSON todavía está en camino.
    effect(() => {
      const department = this.department();
      const loaded = !this.loading();
      const options = this.cityOptions();
      untracked(() => {
        const currentCity = this.city();
        if (!loaded || !currentCity || !department) {
          return;
        }
        const stillValid = options.some((option) => option.value === currentCity);
        if (!stillValid) {
          this.city.set('');
        }
      });
    });
  }

  private async loadCatalog(): Promise<void> {
    try {
      const response = await fetch('./data/co-locations.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      this.departments.set((await response.json()) as ColombiaDepartment[]);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
