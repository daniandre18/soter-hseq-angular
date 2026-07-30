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

async function seedUser(user: SeedUser): Promise<void> {
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
}

async function main(): Promise<void> {
  console.log('Sembrando usuarios de prueba en el Emulator Suite (demo-soter-hseq)...');
  for (const user of SEED_USERS) {
    await seedUser(user);
  }
  console.log(`\nListo. Inicia sesión con cualquiera de esos correos y la contraseña "${DEMO_PASSWORD}".`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Error sembrando datos:', error);
    process.exit(1);
  });
