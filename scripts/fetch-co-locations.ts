/**
 * Descarga el catálogo DIVIPOLA (departamentos + municipios de Colombia)
 * desde los datos abiertos de datos.gov.co y lo escribe como
 * `apps/web/public/data/co-locations.json`.
 *
 * Se ejecuta una sola vez (o cuando se quiera refrescar el catálogo), no en
 * cada build ni en producción — la app nunca llama a datos.gov.co en
 * runtime, solo lee el JSON estático que este script deja en el repo.
 *
 * Fuente (Ministerio de Salud, datasets públicos):
 *   - Departamentos: https://www.datos.gov.co/resource/ya3g-4kqg.json
 *   - Municipios:    https://www.datos.gov.co/resource/pqwj-3fi4.json
 *
 * Uso: npm run fetch:co-locations   (desde scripts/)
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEPARTMENTS_URL = 'https://www.datos.gov.co/resource/ya3g-4kqg.json';
const MUNICIPALITIES_URL = 'https://www.datos.gov.co/resource/pqwj-3fi4.json';
const OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  '../apps/web/public/data/co-locations.json',
);

interface DivipolaDepartmentRow {
  iddepto: string;
  nomdepto: string;
}

interface DivipolaMunicipalityRow {
  iddepto: string;
  idmupio: string;
  nommpio: string;
}

interface ColombiaDepartment {
  code: string;
  name: string;
  cities: { code: string; name: string }[];
}

/** Los datasets vienen en MAYÚSCULAS/Título mixto e inconsistente — se
 *  normaliza a Título (una palabra por palabra) para que se vea bien en el
 *  selector, preservando conectores comunes en minúscula. */
function toTitleCase(text: string): string {
  const lowercaseWords = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa']);
  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) =>
      index > 0 && lowercaseWords.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

async function fetchAllMunicipalities(): Promise<DivipolaMunicipalityRow[]> {
  // El dataset tiene 1122 filas; se pide con margen y `$order` para que la
  // paginación sea estable si algún día se vuelve a correr con más datos.
  const url = `${MUNICIPALITIES_URL}?$limit=5000&$order=iddepto,idmupio`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar municipios (HTTP ${response.status}).`);
  }
  return response.json() as Promise<DivipolaMunicipalityRow[]>;
}

async function fetchAllDepartments(): Promise<DivipolaDepartmentRow[]> {
  const url = `${DEPARTMENTS_URL}?$limit=100&$order=nomdepto`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar departamentos (HTTP ${response.status}).`);
  }
  return response.json() as Promise<DivipolaDepartmentRow[]>;
}

async function main(): Promise<void> {
  console.log('Descargando departamentos...');
  const departmentRows = await fetchAllDepartments();
  console.log(`  ✓ ${departmentRows.length} departamentos`);

  console.log('Descargando municipios...');
  const municipalityRows = await fetchAllMunicipalities();
  console.log(`  ✓ ${municipalityRows.length} municipios`);

  const municipalitiesByDept = new Map<string, DivipolaMunicipalityRow[]>();
  for (const row of municipalityRows) {
    const list = municipalitiesByDept.get(row.iddepto) ?? [];
    list.push(row);
    municipalitiesByDept.set(row.iddepto, list);
  }

  const departments: ColombiaDepartment[] = departmentRows
    .map((dept) => ({
      code: dept.iddepto,
      name: toTitleCase(dept.nomdepto),
      cities: (municipalitiesByDept.get(dept.iddepto) ?? [])
        .map((city) => ({ code: city.idmupio, name: toTitleCase(city.nommpio) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }))
    .filter((dept) => dept.cities.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const totalCities = departments.reduce((sum, dept) => sum + dept.cities.length, 0);
  if (totalCities < 1000) {
    throw new Error(
      `Solo se resolvieron ${totalCities} municipios (se esperaban ~1122) — no se escribe el archivo para no dejar un catálogo incompleto.`,
    );
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(departments), 'utf-8');
  console.log(
    `\nListo: ${departments.length} departamentos, ${totalCities} municipios → ${OUTPUT_PATH}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
