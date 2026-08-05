/**
 * Crea los usuarios de prueba del MVP (CLAUDE.md §21) directamente en el
 * Firebase Emulator Suite. Requiere que los emuladores de Auth y Firestore
 * ya estén corriendo (`npm run emulators` en la raíz del repo).
 *
 * No usar nunca contra un proyecto real: este script depende de las
 * variables *_EMULATOR_HOST y de un projectId "demo-".
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

// Debe coincidir con `DEMO_PASSWORD` en demo-login.ts — los botones de
// login rápido (activados por `demoQuickLoginEnabled`) usan este mismo
// valor fijo contra el Auth emulado.
const DEMO_PASSWORD = '123456';

type UserRole =
  'ADMIN' | 'COMMERCIAL' | 'COORDINATOR' | 'TECHNICIAN' | 'VIEWER';

interface SeedUser {
  email: string;
  displayName: string;
  role: UserRole;
  specialty?: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@soterhseq.demo',
    displayName: 'Carlos Méndez',
    role: 'ADMIN',
  },
  {
    email: 'comercial@soterhseq.demo',
    displayName: 'Luisa Fernández',
    role: 'COMMERCIAL',
  },
  {
    email: 'coordinador@soterhseq.demo',
    displayName: 'Andrés Rojas',
    role: 'COORDINATOR',
  },
  {
    email: 'tecnico1@soterhseq.demo',
    displayName: 'Andrés Morales',
    role: 'TECHNICIAN',
    specialty: 'Seguridad Industrial',
  },
  {
    email: 'tecnico2@soterhseq.demo',
    displayName: 'Diana Castro',
    role: 'TECHNICIAN',
    specialty: 'Higiene Ocupacional',
  },
  {
    email: 'cliente@soterhseq.demo',
    displayName: 'María Torres',
    role: 'VIEWER',
  },
];

interface SeedServiceCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface SeedCatalogService {
  name: string;
  description: string;
  categoryId: SeedServiceCategory['id'];
  unit: string;
}

const WEBSITE_SERVICE_CATEGORIES: SeedServiceCategory[] = [
  {
    id: 'alto-riesgo',
    label: 'Alto Riesgo',
    icon: '🦺',
    color: '#f97316',
  },
  {
    id: 'gestion-emergencias',
    label: 'Gestión de Emergencias',
    icon: '🧯',
    color: '#ef4444',
  },
  {
    id: 'sistemas-gestion',
    label: 'Sistemas de Gestión',
    icon: '📋',
    color: '#3b82f6',
  },
];

/** Catálogo público consultado en https://soterhseq.com/#servicios.
 * Los precios individuales no están publicados, por eso se crean en cero
 * para que el administrador los defina antes de cotizar. */
const WEBSITE_CATALOG_SERVICES: SeedCatalogService[] = [
  {
    name: 'Trabajo en Alturas',
    description:
      'Gestión preventiva, permisos y acompañamiento técnico para ejecutar labores en altura conforme a la normativa vigente.',
    categoryId: 'alto-riesgo',
    unit: 'servicio',
  },
  {
    name: 'Espacios Confinados',
    description:
      'Evaluación de riesgos, permisos de entrada y protocolos para realizar trabajos seguros en espacios confinados.',
    categoryId: 'alto-riesgo',
    unit: 'servicio',
  },
  {
    name: 'Trabajo en Caliente',
    description:
      'Control de riesgos asociados con soldadura, corte y otras fuentes de ignición en procesos industriales.',
    categoryId: 'alto-riesgo',
    unit: 'servicio',
  },
  {
    name: 'Izaje de Cargas',
    description:
      'Planificación, inspección y definición de procedimientos para ejecutar maniobras seguras de izaje de cargas.',
    categoryId: 'alto-riesgo',
    unit: 'servicio',
  },
  {
    name: 'Energías Peligrosas',
    description:
      'Implementación de controles de energías peligrosas, incluyendo procedimientos de bloqueo y etiquetado LOTO.',
    categoryId: 'alto-riesgo',
    unit: 'servicio',
  },
  {
    name: 'Análisis de Riesgos',
    description:
      'Identificación, evaluación y valoración de peligros para priorizar controles y reducir la exposición laboral.',
    categoryId: 'alto-riesgo',
    unit: 'evaluación',
  },
  {
    name: 'Planes de Emergencia',
    description:
      'Diseño o actualización del plan de emergencia según las amenazas y características de cada organización.',
    categoryId: 'gestion-emergencias',
    unit: 'plan',
  },
  {
    name: 'Brigadas de Emergencia',
    description:
      'Conformación, capacitación y entrenamiento práctico de brigadas para responder ante situaciones de emergencia.',
    categoryId: 'gestion-emergencias',
    unit: 'programa',
  },
  {
    name: 'Simulacros',
    description:
      'Planeación y ejecución de simulacros para evaluar la preparación y capacidad de respuesta de la organización.',
    categoryId: 'gestion-emergencias',
    unit: 'jornada',
  },
  {
    name: 'Diseño SG-SST',
    description:
      'Diseño e implementación del Sistema de Gestión de Seguridad y Salud en el Trabajo para la organización.',
    categoryId: 'sistemas-gestion',
    unit: 'proyecto',
  },
  {
    name: 'Planes PESV',
    description:
      'Diseño del Plan Estratégico de Seguridad Vial para empresas, operaciones y flotas vehiculares.',
    categoryId: 'sistemas-gestion',
    unit: 'plan',
  },
];

const app = initializeApp({ projectId: 'demo-soter-hseq' });
const auth = getAuth(app);
const firestore = getFirestore(app);

async function seedUser(user: SeedUser): Promise<string> {
  const existing = await auth.getUserByEmail(user.email).catch(() => null);
  const authUser =
    existing ??
    (await auth.createUser({
      email: user.email,
      password: DEMO_PASSWORD,
      displayName: user.displayName,
      emailVerified: true,
    }));

  const now = Timestamp.now();
  await firestore
    .collection('users')
    .doc(authUser.uid)
    .set(
      {
        uid: authUser.uid,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        status: 'ACTIVE',
        ...(user.specialty && { specialty: user.specialty }),
        createdAt: now,
        createdBy: 'seed-script',
        updatedAt: now,
        updatedBy: 'seed-script',
      },
      { merge: true },
    );

  console.log(`  ✓ ${user.role.padEnd(11)} ${user.email} (${authUser.uid})`);
  return authUser.uid;
}

function normalizeCatalogName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es');
}

/** Importa el portafolio público sin duplicar nombres. Si una categoría o
 * servicio ya existe, reutiliza su documento y conserva el precio definido
 * manualmente en el catálogo. */
async function seedWebsiteCatalog(): Promise<void> {
  console.log('\nSincronizando el catálogo publicado en soterhseq.com...');
  const now = Timestamp.now();
  const categoriesSnapshot = await firestore
    .collection('serviceCategories')
    .get();
  const categoryByName = new Map(
    categoriesSnapshot.docs.map((category) => [
      normalizeCatalogName(category.data()['label'] ?? ''),
      category,
    ]),
  );
  const categoryIds = new Map<string, string>();

  for (const category of WEBSITE_SERVICE_CATEGORIES) {
    const normalizedLabel = normalizeCatalogName(category.label);
    const existingCategory = categoryByName.get(normalizedLabel);
    if (existingCategory) {
      categoryIds.set(category.id, existingCategory.id);
      await existingCategory.ref.set(
        { labelNormalized: normalizedLabel },
        { merge: true },
      );
      console.log(`  ↺ Categoría existente: ${category.label}`);
      continue;
    }

    const categoryRef = firestore
      .collection('serviceCategories')
      .doc(category.id);
    await categoryRef.set({
      label: category.label,
      labelNormalized: normalizedLabel,
      icon: category.icon,
      color: category.color,
      createdAt: now,
      createdBy: 'seed-website-catalog',
    });
    categoryIds.set(category.id, categoryRef.id);
    console.log(`  ✓ Categoría ${category.label}`);
  }

  const servicesSnapshot = await firestore.collection('services').get();
  const serviceByName = new Map(
    servicesSnapshot.docs.map((service) => [
      normalizeCatalogName(service.data()['name'] ?? ''),
      service,
    ]),
  );

  for (const service of WEBSITE_CATALOG_SERVICES) {
    const normalizedName = normalizeCatalogName(service.name);
    const category = categoryIds.get(service.categoryId);
    if (!category) {
      throw new Error(`No se encontró la categoría ${service.categoryId}.`);
    }

    const existingService = serviceByName.get(normalizedName);
    if (existingService) {
      await existingService.ref.set(
        {
          description: service.description,
          category,
          nameNormalized: normalizedName,
          updatedAt: now,
          updatedBy: 'seed-website-catalog',
        },
        { merge: true },
      );
      console.log(`  ↺ Servicio actualizado: ${service.name}`);
      continue;
    }

    await firestore.collection('services').add({
      name: service.name,
      nameNormalized: normalizedName,
      description: service.description,
      category,
      price: 0,
      unit: service.unit,
      active: true,
      createdAt: now,
      createdBy: 'seed-website-catalog',
      updatedAt: now,
      updatedBy: 'seed-website-catalog',
    });
    console.log(`  ✓ Servicio ${service.name}`);
  }
}

interface SeedClient {
  businessName: string;
  taxId: string;
  city: string;
}

interface DetailedSeedClient extends SeedClient {
  legalName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  contact: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  site: {
    name: string;
    address: string;
    city: string;
  };
}

const SEED_CLIENTS: SeedClient[] = [
  {
    businessName: 'Constructora Andina SAS',
    taxId: '900111222-3',
    city: 'Bogotá',
  },
  {
    businessName: 'Minera del Norte SA',
    taxId: '900333444-5',
    city: 'Barranquilla',
  },
  {
    businessName: 'Textiles Bogotá Ltda',
    taxId: '900555666-7',
    city: 'Bogotá',
  },
];

export const ADDITIONAL_SEED_CLIENTS: DetailedSeedClient[] = [
  {
    businessName: 'Alimentos del Valle SAS',
    legalName: 'Alimentos del Valle Colombiano S.A.S.',
    taxId: '901384726-1',
    email: 'compras@alimentosdelvalle.com.co',
    phone: '+57 602 485 2170',
    address: 'Calle 38 # 5N-42',
    city: 'Cali',
    notes: 'Empresa de producción y distribución de alimentos refrigerados. Opera en dos turnos.',
    contact: {
      name: 'Natalia Herrera Gómez',
      position: 'Coordinadora de SST',
      email: 'natalia.herrera@alimentosdelvalle.com.co',
      phone: '+57 315 642 9081',
    },
    site: { name: 'Planta Yumbo', address: 'Carrera 32 # 12-85, Zona Industrial', city: 'Yumbo' },
  },
  {
    businessName: 'Logística Caribe SAS',
    legalName: 'Logística Integral del Caribe S.A.S.',
    taxId: '900847315-6',
    email: 'administracion@logisticacaribe.com.co',
    phone: '+57 605 693 1842',
    address: 'Avenida Pedro de Heredia # 31-45',
    city: 'Cartagena',
    notes: 'Operador logístico con almacenamiento, transporte terrestre y manejo de mercancías.',
    contact: {
      name: 'Jorge Luis Paternina',
      position: 'Jefe HSEQ',
      email: 'jpaternina@logisticacaribe.com.co',
      phone: '+57 300 518 2746',
    },
    site: { name: 'Centro de distribución Mamonal', address: 'Kilómetro 4, Vía Mamonal', city: 'Cartagena' },
  },
  {
    businessName: 'Metalmecánica Antioqueña SAS',
    legalName: 'Soluciones Metalmecánicas Antioqueñas S.A.S.',
    taxId: '901126593-8',
    email: 'contacto@metalantioquena.com.co',
    phone: '+57 604 444 7390',
    address: 'Carrera 50 # 29 Sur-18',
    city: 'Medellín',
    notes: 'Fabricación de estructuras metálicas y mantenimiento industrial. Requiere control de trabajo en caliente.',
    contact: {
      name: 'Carolina Restrepo Vélez',
      position: 'Directora de Gestión Humana',
      email: 'crestrepo@metalantioquena.com.co',
      phone: '+57 310 774 1265',
    },
    site: { name: 'Taller Itagüí', address: 'Calle 36 # 54-21, Zona Industrial', city: 'Itagüí' },
  },
  {
    businessName: 'Clínica Santa Isabel SAS',
    legalName: 'Institución Prestadora de Servicios de Salud Santa Isabel S.A.S.',
    taxId: '900562418-3',
    email: 'proveedores@clinicasantaisabel.com.co',
    phone: '+57 607 697 0520',
    address: 'Carrera 33 # 48-76',
    city: 'Bucaramanga',
    notes: 'IPS de mediana complejidad con atención 24 horas y aproximadamente 180 colaboradores.',
    contact: {
      name: 'Diana Marcela Quintero',
      position: 'Líder de Seguridad y Salud en el Trabajo',
      email: 'dquintero@clinicasantaisabel.com.co',
      phone: '+57 316 205 4389',
    },
    site: { name: 'Sede Cabecera', address: 'Carrera 33 # 48-76', city: 'Bucaramanga' },
  },
  {
    businessName: 'Agroindustria Los Llanos SAS',
    legalName: 'Agroindustria y Cultivos de los Llanos S.A.S.',
    taxId: '901473820-5',
    email: 'gerencia@agrollanos.com.co',
    phone: '+57 608 661 9043',
    address: 'Calle 15 # 38-60',
    city: 'Villavicencio',
    notes: 'Cultivo, procesamiento y empaque de productos agrícolas con operación en zona rural.',
    contact: {
      name: 'Miguel Ángel Cárdenas',
      position: 'Administrador de Operaciones',
      email: 'mcardenas@agrollanos.com.co',
      phone: '+57 320 884 5931',
    },
    site: { name: 'Planta Puerto López', address: 'Kilómetro 8, Vía Puerto López', city: 'Puerto López' },
  },
  {
    businessName: 'Empaques del Eje Cafetero SAS',
    legalName: 'Empaques Sostenibles del Eje Cafetero S.A.S.',
    taxId: '901208647-9',
    email: 'servicioalcliente@empaqueseje.com.co',
    phone: '+57 606 340 8126',
    address: 'Avenida 30 de Agosto # 87-32',
    city: 'Pereira',
    notes: 'Fabricante de empaques de cartón y materiales reciclables para clientes del sector alimentos.',
    contact: {
      name: 'Laura Vanessa Ocampo',
      position: 'Profesional HSEQ',
      email: 'locampo@empaqueseje.com.co',
      phone: '+57 312 593 7418',
    },
    site: { name: 'Planta Dosquebradas', address: 'Carrera 10 # 18-94, La Badea', city: 'Dosquebradas' },
  },
];

/** Agrega clientes detallados sin depender de que el emulador esté vacío.
 * Usa el NIT como identidad estable para que repetir el seed no duplique datos. */
async function seedAdditionalClients(): Promise<void> {
  console.log('\nSincronizando clientes adicionales de prueba...');
  const now = Timestamp.now();

  for (const client of ADDITIONAL_SEED_CLIENTS) {
    const existing = await firestore
      .collection('clients')
      .where('taxId', '==', client.taxId)
      .limit(1)
      .get();
    const ref = existing.docs[0]?.ref ?? firestore.collection('clients').doc();

    await ref.set(
      {
        businessName: client.businessName,
        businessNameNormalized: normalizeCatalogName(client.businessName),
        legalName: client.legalName,
        taxId: client.taxId,
        taxIdNormalized: client.taxId.replace(/\D/g, ''),
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        notes: client.notes,
        status: 'ACTIVE',
        tags: [],
        ...(existing.empty && { createdAt: now, createdBy: 'seed-script' }),
        updatedAt: now,
        updatedBy: 'seed-script',
      },
      { merge: true },
    );

    await ref.collection('contacts').doc('principal').set(
      { ...client.contact, isPrimary: true, status: 'ACTIVE' },
      { merge: true },
    );
    await ref.collection('sites').doc('principal').set(
      {
        ...client.site,
        nameNormalized: normalizeCatalogName(client.site.name),
        responsible: client.contact,
        status: 'ACTIVE',
        createdAt: now,
        createdBy: 'seed-script',
        updatedAt: now,
        updatedBy: 'seed-script',
      },
      { merge: true },
    );

    console.log(`  ${existing.empty ? '✓' : '↺'} Cliente ${client.businessName}`);
  }
}

interface SeedOrderSpec {
  clientIndex: number;
  serviceSummary: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'CLOSED';
  assignTechnician: boolean;
  schedule: boolean;
  dayOffset?: number;
  startHour?: number;
  durationHours?: number;
}

const SEED_ORDERS: SeedOrderSpec[] = [
  {
    clientIndex: 0,
    serviceSummary: 'Inspección de seguridad — planta principal',
    status: 'DRAFT',
    assignTechnician: false,
    schedule: false,
  },
  {
    clientIndex: 1,
    serviceSummary: 'Auditoría ISO 45001 — Textiles Andinos',
    status: 'ASSIGNED',
    assignTechnician: true,
    schedule: true,
    dayOffset: 1,
    startHour: 9,
    durationHours: 8,
  },
  {
    clientIndex: 2,
    serviceSummary: 'Capacitación en manejo de químicos',
    status: 'ASSIGNED',
    assignTechnician: true,
    schedule: true,
    dayOffset: 3,
    startHour: 8,
    durationHours: 4,
  },
  {
    clientIndex: 0,
    serviceSummary: 'Inspección de trabajo seguro en alturas',
    status: 'SCHEDULED',
    assignTechnician: false,
    schedule: true,
    dayOffset: 5,
    startHour: 7,
    durationHours: 5,
  },
  {
    clientIndex: 1,
    serviceSummary: 'Evaluación de riesgo biomecánico',
    status: 'ASSIGNED',
    assignTechnician: true,
    schedule: true,
    dayOffset: 8,
    startHour: 10,
    durationHours: 3,
  },
  {
    clientIndex: 2,
    serviceSummary: 'Medición de iluminación y ruido',
    status: 'ASSIGNED',
    assignTechnician: true,
    schedule: true,
    dayOffset: 12,
    startHour: 8,
    durationHours: 6,
  },
  {
    clientIndex: 0,
    serviceSummary: 'Revisión de extintores y señalización',
    status: 'CLOSED',
    assignTechnician: true,
    schedule: true,
    dayOffset: -5,
    startHour: 9,
    durationHours: 3,
  },
];

/**
 * Además de los usuarios, deja clientes/cotizaciones/órdenes de ejemplo en
 * varios estados para que el dashboard y los listados no arranquen vacíos
 * en una demo (CLAUDE.md §27 Fase 8 "datos semilla"). Se salta por completo
 * si ya hay clientes — evita duplicar datos en un `npm run seed` repetido
 * sobre el mismo emulador.
 */
async function seedDemoData(technicianUids: string[]): Promise<void> {
  const existingClients = await firestore.collection('clients').limit(1).get();
  if (!existingClients.empty) {
    console.log(
      '\nYa hay clientes en el emulador — se omite la siembra de datos de demo.',
    );
    return;
  }

  console.log('\nSembrando clientes, cotizaciones y órdenes de ejemplo...');
  const now = Timestamp.now();

  const clientIds: string[] = [];
  for (const client of SEED_CLIENTS) {
    const ref = firestore.collection('clients').doc();
    await ref.set({
      businessName: client.businessName,
      taxId: client.taxId,
      city: client.city,
      status: 'ACTIVE',
      createdAt: now,
      createdBy: 'seed-script',
      updatedAt: now,
      updatedBy: 'seed-script',
    });
    clientIds.push(ref.id);
    console.log(`  ✓ Cliente ${client.businessName}`);
  }

  let orderCounter = 1;
  for (const spec of SEED_ORDERS) {
    const client = SEED_CLIENTS[spec.clientIndex];
    const clientId = clientIds[spec.clientIndex];

    const quoteRef = firestore.collection('quotes').doc();
    const quoteNumber = `COT-${orderCounter.toString().padStart(4, '0')}`;
    const total = 1_000_000 + orderCounter * 250_000;
    await quoteRef.set({
      quoteNumber,
      clientId,
      clientBusinessName: client.businessName,
      status: 'CONVERTED',
      issueDate: now,
      currency: 'COP',
      subtotal: total,
      tax: 0,
      discount: 0,
      total,
      createdAt: now,
      createdBy: 'seed-script',
      updatedAt: now,
      updatedBy: 'seed-script',
    });
    await quoteRef.collection('items').doc().set({
      description: spec.serviceSummary,
      quantity: 1,
      unitPrice: total,
      taxRate: 0,
      subtotal: total,
      total,
      position: 0,
    });

    const orderRef = firestore.collection('orders').doc();
    const orderNumber = `OT-${orderCounter.toString().padStart(4, '0')}`;
    const scheduledStartDate = new Date();
    scheduledStartDate.setDate(
      scheduledStartDate.getDate() + (spec.dayOffset ?? 1),
    );
    scheduledStartDate.setHours(spec.startHour ?? 9, 0, 0, 0);
    const scheduledEndDate = new Date(scheduledStartDate);
    scheduledEndDate.setHours(
      scheduledEndDate.getHours() + (spec.durationHours ?? 3),
    );
    const scheduledStart = spec.schedule
      ? Timestamp.fromDate(scheduledStartDate)
      : undefined;
    const scheduledEnd = spec.schedule
      ? Timestamp.fromDate(scheduledEndDate)
      : undefined;
    const assignedTechnicianIds = spec.assignTechnician
      ? [technicianUids[orderCounter % technicianUids.length]]
      : [];

    await orderRef.set({
      orderNumber,
      quoteId: quoteRef.id,
      clientId,
      clientBusinessName: client.businessName,
      assignedTechnicianIds,
      title: spec.serviceSummary,
      priority: orderCounter % 3 === 0 ? 'HIGH' : 'MEDIUM',
      progress:
        spec.status === 'CLOSED' ? 100 : spec.status === 'IN_PROGRESS' ? 45 : 0,
      dueDate: Timestamp.fromDate(
        new Date(scheduledEndDate.getTime() + 24 * 3600 * 1000),
      ),
      serviceAddress: `Sede ${client.city}`,
      city: client.city,
      ...(scheduledStart && { scheduledStart }),
      ...(scheduledEnd && { scheduledEnd }),
      ...(spec.status !== 'DRAFT' &&
        spec.status !== 'ASSIGNED' && { actualStart: now }),
      status: spec.status,
      serviceSummary: spec.serviceSummary,
      evidenceCount: 0,
      createdAt: now,
      createdBy: 'seed-script',
      updatedAt: now,
      updatedBy: 'seed-script',
    });
    await quoteRef.update({ orderId: orderRef.id });

    console.log(
      `  ✓ Orden ${orderNumber} (${spec.status}) — ${client.businessName}`,
    );
    orderCounter += 1;
  }
}

/** Vincula el acceso de consulta con una única empresa. Se ejecuta aparte de
 * `seedDemoData` para que también repare un emulador que ya tenía datos. */
async function linkViewerToDemoClient(
  viewerUid: string | undefined,
): Promise<void> {
  if (!viewerUid) {
    return;
  }

  const clientSnapshot = await firestore
    .collection('clients')
    .where('businessName', '==', 'Minera del Norte SA')
    .limit(1)
    .get();
  const client = clientSnapshot.docs[0];
  if (!client) {
    console.warn(
      '  ! No se encontró Minera del Norte SA para vincular el perfil Cliente.',
    );
    return;
  }

  await firestore.collection('users').doc(viewerUid).update({
    clientId: client.id,
    updatedAt: Timestamp.now(),
    updatedBy: 'seed-script',
  });
  console.log(
    `  ✓ Cliente María Torres vinculado a ${client.data()['businessName']}`,
  );
}

/**
 * Mantiene un conjunto idempotente de visitas próximas para probar la agenda.
 * Usa clientes ya presentes en el emulador y documentos con ids fijos, por lo
 * que repetir el seed actualiza las fechas relativas sin duplicar registros.
 */
async function seedAgendaVisits(technicianUids: string[]): Promise<void> {
  const clientsSnapshot = await firestore.collection('clients').limit(3).get();
  if (clientsSnapshot.empty || technicianUids.length === 0) {
    console.log(
      '\nNo hay clientes o técnicos suficientes para sembrar la agenda.',
    );
    return;
  }

  console.log('\nSembrando visitas programadas para la agenda...');
  const clients = clientsSnapshot.docs;
  const visits = [
    {
      title: 'Auditoría ISO 45001',
      dayOffset: 1,
      startHour: 9,
      durationHours: 8,
    },
    {
      title: 'Capacitación en manejo de químicos',
      dayOffset: 3,
      startHour: 8,
      durationHours: 4,
    },
    {
      title: 'Inspección de trabajo seguro en alturas',
      dayOffset: 5,
      startHour: 7,
      durationHours: 5,
    },
    {
      title: 'Evaluación de riesgo biomecánico',
      dayOffset: 8,
      startHour: 10,
      durationHours: 3,
    },
    {
      title: 'Medición de iluminación y ruido',
      dayOffset: 12,
      startHour: 8,
      durationHours: 6,
    },
  ];

  for (const [index, visit] of visits.entries()) {
    const client = clients[index % clients.length];
    const clientData = client.data();
    const technicianId = technicianUids[index % technicianUids.length];
    const start = new Date();
    start.setDate(start.getDate() + visit.dayOffset);
    start.setHours(visit.startHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + visit.durationHours);
    const now = Timestamp.now();

    await firestore
      .collection('orders')
      .doc(`agenda-demo-${index + 1}`)
      .set(
        {
          orderNumber: `VIS-${(index + 1).toString().padStart(4, '0')}`,
          clientId: client.id,
          clientBusinessName: clientData['businessName'],
          assignedTechnicianIds: [technicianId],
          title: `${visit.title} — ${clientData['businessName']}`,
          serviceSummary: visit.title,
          priority: index === 2 ? 'HIGH' : 'MEDIUM',
          progress: 0,
          dueDate: Timestamp.fromDate(
            new Date(end.getTime() + 24 * 3600 * 1000),
          ),
          scheduledStart: Timestamp.fromDate(start),
          scheduledEnd: Timestamp.fromDate(end),
          serviceAddress:
            clientData['address'] ??
            `Sede ${clientData['city'] ?? 'principal'}`,
          city: clientData['city'] ?? '',
          status: 'ASSIGNED',
          evidenceCount: 0,
          createdAt: now,
          createdBy: 'seed-agenda',
          updatedAt: now,
          updatedBy: 'seed-agenda',
        },
        { merge: true },
      );
    console.log(
      `  ✓ VIS-${(index + 1).toString().padStart(4, '0')} — ${visit.title}`,
    );
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--clients-only')) {
    console.log('Sembrando únicamente clientes adicionales de prueba...');
    await seedAdditionalClients();
    console.log('\nClientes sincronizados correctamente.');
    return;
  }

  if (process.argv.includes('--catalog-only')) {
    console.log('Sembrando únicamente el catálogo de servicios...');
    await seedWebsiteCatalog();
    console.log('\nCatálogo sincronizado correctamente.');
    return;
  }

  console.log(
    'Sembrando usuarios de prueba en el Emulator Suite (demo-soter-hseq)...',
  );
  const uidsByRole = new Map<UserRole, string[]>();
  for (const user of SEED_USERS) {
    const uid = await seedUser(user);
    uidsByRole.set(user.role, [...(uidsByRole.get(user.role) ?? []), uid]);
  }

  await seedWebsiteCatalog();
  await seedDemoData(uidsByRole.get('TECHNICIAN') ?? []);
  await seedAdditionalClients();
  await linkViewerToDemoClient(uidsByRole.get('VIEWER')?.[0]);
  await seedAgendaVisits(uidsByRole.get('TECHNICIAN') ?? []);

  console.log(
    `\nListo. Inicia sesión con cualquiera de esos correos y la contraseña "${DEMO_PASSWORD}".`,
  );
}

if (process.argv[1]?.endsWith('seed-emulator.ts')) {
  main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error('Error sembrando datos:', error);
      process.exit(1);
    });
}
