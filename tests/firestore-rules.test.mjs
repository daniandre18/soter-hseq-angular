import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-soter-hseq';
let testEnvironment;

const USERS = {
  admin: {
    uid: 'admin',
    displayName: 'Administradora',
    email: 'admin@soterhseq.demo',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  coordinator: {
    uid: 'coordinator',
    displayName: 'Coordinador',
    email: 'coordinator@soterhseq.demo',
    role: 'COORDINATOR',
    status: 'ACTIVE',
  },
  commercial: {
    uid: 'commercial',
    displayName: 'Comercial',
    email: 'commercial@soterhseq.demo',
    role: 'COMMERCIAL',
    status: 'ACTIVE',
  },
  viewer: {
    uid: 'viewer',
    displayName: 'Cliente',
    email: 'viewer@cliente.demo',
    role: 'VIEWER',
    status: 'ACTIVE',
    clientId: 'client-1',
  },
  inactiveCommercial: {
    uid: 'inactive-commercial',
    displayName: 'Comercial inactiva',
    email: 'inactive@soterhseq.demo',
    role: 'COMMERCIAL',
    status: 'INACTIVE',
  },
};

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all(
      Object.values(USERS).map((user) =>
        setDoc(doc(firestore, 'users', user.uid), {
          ...user,
          createdAt: new Date('2026-08-01'),
          createdBy: 'seed',
          updatedAt: new Date('2026-08-01'),
          updatedBy: 'seed',
        }),
      ),
    );
    await Promise.all([
      setDoc(doc(firestore, 'clients', 'client-1'), {
        businessName: 'Cliente Uno',
        taxId: '900001',
        status: 'ACTIVE',
        tags: [],
      }),
      setDoc(doc(firestore, 'clients', 'client-2'), {
        businessName: 'Cliente Dos',
        taxId: '900002',
        status: 'ACTIVE',
        tags: [],
      }),
    ]);
  });
});

after(async () => {
  await testEnvironment.cleanup();
});

test('an active administrator can read the internal user directory', async () => {
  const firestore = testEnvironment.authenticatedContext('admin').firestore();
  await assertSucceeds(getDoc(doc(firestore, 'users', 'coordinator')));
});

test('an inactive internal user cannot read protected data', async () => {
  const firestore = testEnvironment.authenticatedContext('inactive-commercial').firestore();
  await assertFails(getDoc(doc(firestore, 'users', 'coordinator')));
  await assertSucceeds(getDoc(doc(firestore, 'users', 'inactive-commercial')));
});

test('an administrator cannot change roles or statuses directly from the browser', async () => {
  const firestore = testEnvironment.authenticatedContext('admin').firestore();
  const coordinator = doc(firestore, 'users', 'coordinator');

  await assertFails(updateDoc(coordinator, { role: 'ADMIN' }));
  await assertFails(updateDoc(coordinator, { status: 'INACTIVE' }));
  await assertSucceeds(updateDoc(coordinator, { displayName: 'Coordinadora actualizada' }));
});

test('a user cannot reactivate their own account directly', async () => {
  const firestore = testEnvironment.authenticatedContext('inactive-commercial').firestore();
  await assertFails(
    updateDoc(doc(firestore, 'users', 'inactive-commercial'), {
      status: 'ACTIVE',
    }),
  );
});

test('a client portal user can only read the company linked to their profile', async () => {
  const firestore = testEnvironment.authenticatedContext('viewer').firestore();
  await assertSucceeds(getDoc(doc(firestore, 'clients', 'client-1')));
  await assertFails(getDoc(doc(firestore, 'clients', 'client-2')));
});

test('portal accounts and their client linkage cannot be created directly from the browser', async () => {
  const firestore = testEnvironment.authenticatedContext('commercial').firestore();
  await assertFails(
    setDoc(doc(firestore, 'users', 'viewer-2'), {
      uid: 'viewer-2',
      displayName: 'Otro cliente',
      email: 'otro@cliente.demo',
      role: 'VIEWER',
      status: 'ACTIVE',
      clientId: 'client-1',
    }),
  );
  await assertFails(
    updateDoc(doc(firestore, 'clients', 'client-1'), {
      portalUserId: 'viewer-2',
    }),
  );
  await assertSucceeds(
    updateDoc(doc(firestore, 'clients', 'client-1'), {
      businessName: 'Cliente Uno SAS',
    }),
  );
});
