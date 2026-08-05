/**
 * Sincroniza exclusivamente los seis clientes detallados de demostración en
 * el proyecto productivo. Requiere la confirmación explícita del argumento y
 * reutiliza la sesión autenticada del Firebase CLI sin imprimir credenciales.
 */
import { createRequire } from 'node:module';
import { ADDITIONAL_SEED_CLIENTS } from './seed-emulator';

const PROJECT_ID = 'soter-hseq';
const DATABASE_PATH = `projects/${PROJECT_ID}/databases/(default)/documents`;

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function firestoreValue(value: string | boolean | Date | Record<string, unknown>): FirestoreValue {
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  return { mapValue: { fields: firestoreFields(value) } };
}

function firestoreFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      firestoreValue(value as string | boolean | Date | Record<string, unknown>),
    ]),
  );
}

function documentWrite(path: string, data: Record<string, unknown>): object {
  return {
    update: {
      name: `${DATABASE_PATH}/${path}`,
      fields: firestoreFields(data),
    },
  };
}

async function main(): Promise<void> {
  if (!process.argv.includes('--confirm-production')) {
    throw new Error('Falta --confirm-production; no se escribió ningún dato.');
  }

  const require = createRequire(__filename);
  const firebaseAuth = require('firebase-tools/lib/auth') as {
    getGlobalDefaultAccount: () => { tokens: { refresh_token: string } } | undefined;
    getAccessToken: (
      refreshToken: string,
      scopes: string[],
    ) => Promise<{ access_token: string }>;
  };
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens.refresh_token) {
    throw new Error('No hay una sesión activa del Firebase CLI.');
  }
  const { access_token: accessToken } = await firebaseAuth.getAccessToken(
    account.tokens.refresh_token,
    [],
  );
  const now = new Date();
  const writes: object[] = [];

  for (const client of ADDITIONAL_SEED_CLIENTS) {
    const documentId = `seed-client-${client.taxId.replace(/\D/g, '')}`;
    writes.push(
      documentWrite(`clients/${documentId}`, {
        businessName: client.businessName,
        businessNameNormalized: client.businessName.toLocaleLowerCase('es'),
        legalName: client.legalName,
        taxId: client.taxId,
        taxIdNormalized: client.taxId.replace(/\D/g, ''),
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        notes: client.notes,
        status: 'ACTIVE',
        createdAt: now,
        createdBy: 'production-seed',
        updatedAt: now,
        updatedBy: 'production-seed',
      }),
      documentWrite(`clients/${documentId}/contacts/principal`, {
        ...client.contact,
        isPrimary: true,
        status: 'ACTIVE',
      }),
      documentWrite(`clients/${documentId}/sites/principal`, {
        ...client.site,
        nameNormalized: client.site.name.toLocaleLowerCase('es'),
        responsible: client.contact,
        status: 'ACTIVE',
        createdAt: now,
        createdBy: 'production-seed',
        updatedAt: now,
        updatedBy: 'production-seed',
      }),
    );
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'x-goog-user-project': PROJECT_ID,
      },
      body: JSON.stringify({ writes }),
    },
  );
  if (!response.ok) {
    throw new Error(`Firestore respondió ${response.status}: ${await response.text()}`);
  }

  for (const client of ADDITIONAL_SEED_CLIENTS) {
    console.log(`  ✓ ${client.businessName}`);
  }
  console.log(`\n${ADDITIONAL_SEED_CLIENTS.length} clientes sincronizados en ${PROJECT_ID}.`);
}

main().catch((error: unknown) => {
  console.error('Error sincronizando clientes de producción:', error);
  process.exitCode = 1;
});
