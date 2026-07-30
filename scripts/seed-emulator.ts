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

const DEMO_PASSWORD = 'Demo1234!';

type UserRole = 'ADMIN' | 'COMMERCIAL' | 'COORDINATOR' | 'TECHNICIAN' | 'VIEWER';

interface SeedUser {
  email: string;
  displayName: string;
  role: UserRole;
}

const SEED_USERS: SeedUser[] = [
  { email: 'admin@soterhseq.demo', displayName: 'Carlos Méndez', role: 'ADMIN' },
  { email: 'comercial@soterhseq.demo', displayName: 'Luisa Fernández', role: 'COMMERCIAL' },
  { email: 'coordinador@soterhseq.demo', displayName: 'Andrés Rojas', role: 'COORDINATOR' },
  { email: 'tecnico1@soterhseq.demo', displayName: 'Andrés Morales', role: 'TECHNICIAN' },
  { email: 'tecnico2@soterhseq.demo', displayName: 'Diana Castro', role: 'TECHNICIAN' },
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

interface SeedClient {
  businessName: string;
  taxId: string;
  city: string;
}

const SEED_CLIENTS: SeedClient[] = [
  { businessName: 'Constructora Andina SAS', taxId: '900111222-3', city: 'Bogotá' },
  { businessName: 'Minera del Norte SA', taxId: '900333444-5', city: 'Barranquilla' },
  { businessName: 'Textiles Bogotá Ltda', taxId: '900555666-7', city: 'Bogotá' },
];

interface SeedOrderSpec {
  clientIndex: number;
  serviceSummary: string;
  status: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'CLOSED';
  assignTechnician: boolean;
  schedule: boolean;
}

const SEED_ORDERS: SeedOrderSpec[] = [
  { clientIndex: 0, serviceSummary: 'Inspección de seguridad — planta principal', status: 'DRAFT', assignTechnician: false, schedule: false },
  { clientIndex: 1, serviceSummary: 'Auditoría HSEQ — bodega de insumos', status: 'ASSIGNED', assignTechnician: true, schedule: true },
  { clientIndex: 2, serviceSummary: 'Capacitación en manejo de químicos', status: 'IN_PROGRESS', assignTechnician: true, schedule: true },
  { clientIndex: 0, serviceSummary: 'Revisión de extintores y señalización', status: 'CLOSED', assignTechnician: true, schedule: true },
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
    console.log('\nYa hay clientes en el emulador — se omite la siembra de datos de demo.');
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
    const scheduledStart = spec.schedule
      ? Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000)
      : undefined;
    const scheduledEnd = spec.schedule
      ? Timestamp.fromMillis(Date.now() + 27 * 3600 * 1000)
      : undefined;
    const assignedTechnicianIds = spec.assignTechnician ? [technicianUids[orderCounter % technicianUids.length]] : [];

    await orderRef.set({
      orderNumber,
      quoteId: quoteRef.id,
      clientId,
      clientBusinessName: client.businessName,
      assignedTechnicianIds,
      ...(scheduledStart && { scheduledStart }),
      ...(scheduledEnd && { scheduledEnd }),
      ...(spec.status !== 'DRAFT' && spec.status !== 'ASSIGNED' && { actualStart: now }),
      status: spec.status,
      serviceSummary: spec.serviceSummary,
      evidenceCount: 0,
      createdAt: now,
      createdBy: 'seed-script',
      updatedAt: now,
      updatedBy: 'seed-script',
    });
    await quoteRef.update({ orderId: orderRef.id });

    console.log(`  ✓ Orden ${orderNumber} (${spec.status}) — ${client.businessName}`);
    orderCounter += 1;
  }
}

async function main(): Promise<void> {
  console.log('Sembrando usuarios de prueba en el Emulator Suite (demo-soter-hseq)...');
  const uidsByRole = new Map<UserRole, string[]>();
  for (const user of SEED_USERS) {
    const uid = await seedUser(user);
    uidsByRole.set(user.role, [...(uidsByRole.get(user.role) ?? []), uid]);
  }

  await seedDemoData(uidsByRole.get('TECHNICIAN') ?? []);

  console.log(`\nListo. Inicia sesión con cualquiera de esos correos y la contraseña "${DEMO_PASSWORD}".`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Error sembrando datos:', error);
    process.exit(1);
  });
