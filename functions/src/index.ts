import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { GoogleGenAI } from '@google/genai';
import PDFDocument from 'pdfkit';

initializeApp();

type Role = 'ADMIN' | 'COMMERCIAL' | 'COORDINATOR' | 'TECHNICIAN' | 'VIEWER';

/**
 * Storage Rules necesitaría `firestore.get()` para validar rol/asignación
 * antes de aceptar una lectura o escritura (CLAUDE.md §13.3/§13.4) — pero
 * esa lectura cruzada Storage→Firestore no es confiable en este proyecto
 * (falla incluso con un `firestore.exists()` mínimo, verificado a mano).
 * Por eso `storage.rules` deniega todo acceso directo del cliente, y el
 * único camino para leer o escribir en Storage es el Admin SDK: esta
 * función construye la misma URL con token que genera `getDownloadURL()`
 * del SDK de cliente, para poder guardarla ya resuelta en Firestore.
 */
function buildDownloadUrl(bucketName: string, path: string, token: string): string {
  // El Storage Emulator sirve en su propio host (`FIREBASE_STORAGE_EMULATOR_HOST`,
  // ej. "127.0.0.1:9199") en vez de `firebasestorage.googleapis.com` — sin este
  // caso, la URL guardada apuntaría siempre a producción y las imágenes
  // nunca cargarían en local aunque el archivo sí exista en el emulador.
  const emulatorHost = process.env['FIREBASE_STORAGE_EMULATOR_HOST'];
  const base = emulatorHost ? `http://${emulatorHost}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * El Admin SDK ignora las Firestore Rules, así que cualquier función que
 * escriba datos sensibles debe validar el rol por su cuenta leyendo el
 * documento de `users` (CLAUDE.md §13.1: "nunca confiar en el rol enviado
 * por el cliente" — aquí se resuelve siempre desde Firestore, no de
 * `request.data`).
 */
async function requireRole(uid: string, allowedRoles: Role[]): Promise<Role> {
  const userDoc = await getFirestore().collection('users').doc(uid).get();
  const role = userDoc.data()?.['role'] as Role | undefined;
  if (!role || !allowedRoles.includes(role)) {
    throw new HttpsError('permission-denied', 'Tu rol no tiene permiso para esta acción.');
  }
  return role;
}

type OrderEventAction =
  | 'NOTE_ADDED'
  | 'EVIDENCE_UPLOADED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_ASSIGNED'
  | 'CLIENT_ACCEPTED_ACT'
  | 'CLIENT_REQUESTED_ACT_CHANGES'
  | 'ORDER_CLOSED';

interface OrderEventInput {
  orderId: string;
  action: OrderEventAction;
  description: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

/**
 * Forma normalizada de `AuditEvent` (CLAUDE.md §9.9). La usan tanto la
 * bitácora por orden (`orders/{orderId}/events`, `firestore.rules`: solo
 * lectura de cliente) como la global `auditEvents` (solo ADMIN/COORDINATOR),
 * para que ambas queden consistentes entre sí.
 */
function buildOrderEventData(
  input: OrderEventInput,
  now: FirebaseFirestore.FieldValue,
): FirebaseFirestore.DocumentData {
  return {
    entityType: 'ORDER' as const,
    entityId: input.orderId,
    action: input.action,
    description: input.description,
    metadata: input.metadata ?? null,
    createdAt: now,
    createdBy: input.createdBy,
  };
}

/**
 * Único escritor de `orders/{orderId}/events` — la regla del cliente es
 * `write: if false`, así que solo puede poblarse desde aquí, ya sea por un
 * trigger de Firestore (notas/evidencia/cambios de la orden, que hoy se
 * escriben directo desde Angular) o por una función `onCall` como
 * `closeOrder`.
 */
async function recordOrderEvent(input: OrderEventInput): Promise<void> {
  const firestore = getFirestore();
  await firestore
    .collection('orders')
    .doc(input.orderId)
    .collection('events')
    .add(buildOrderEventData(input, FieldValue.serverTimestamp()));
}

type NotificationType =
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_ASSIGNED'
  | 'NOTE_ADDED'
  | 'EVIDENCE_UPLOADED'
  | 'QUOTE_STATUS_CHANGED'
  | 'CLOSING_ACT_CLIENT_DECISION';

interface NotificationInput {
  type: NotificationType;
  title: string;
  description: string;
  entityType: 'ORDER' | 'QUOTE';
  entityId: string;
  createdBy: string;
}

/**
 * Escribe en el inbox global de ADMIN/COORDINATOR (`notifications`,
 * `firestore.rules`: `allow create: if false`) — un documento por evento,
 * visible para todo el rol sin fan-out; `readBy` empieza vacío y cada quien
 * agrega su propio uid al marcarlo leído. `dismissedBy` hace lo mismo al
 * descartarlo, sin borrar el evento para los demás usuarios.
 */
async function notifyAdmins(input: NotificationInput): Promise<void> {
  const firestore = getFirestore();
  await firestore.collection('notifications').add({
    ...input,
    readBy: [],
    dismissedBy: [],
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Nota agregada a una orden (CLAUDE.md §9.7) — la escribe directo Angular, así que se audita por trigger. */
export const onNoteCreated = onDocumentCreated('orders/{orderId}/notes/{noteId}', async (event) => {
  const data = event.data?.data();
  if (!data) {
    return;
  }
  const orderId = event.params.orderId;
  // `notes` no incluye orderNumber/clientBusinessName del padre — una
  // lectura acotada (un doc) para que la notificación sea legible.
  const orderSnapshot = await getFirestore().collection('orders').doc(orderId).get();
  const orderNumber = orderSnapshot.data()?.['orderNumber'] ?? orderId;
  const clientBusinessName = orderSnapshot.data()?.['clientBusinessName'] ?? '';

  await Promise.all([
    recordOrderEvent({
      orderId,
      action: 'NOTE_ADDED',
      description: `Nota registrada (${data['noteType']})`,
      metadata: { noteId: event.params.noteId, noteType: data['noteType'] },
      createdBy: data['createdBy'],
    }),
    notifyAdmins({
      type: 'NOTE_ADDED',
      title: `Nueva nota en la orden ${orderNumber}`,
      description: `${clientBusinessName} — nota tipo ${data['noteType']}`,
      entityType: 'ORDER',
      entityId: orderId,
      createdBy: data['createdBy'],
    }),
  ]);
});

/** Evidencia cargada a una orden (CLAUDE.md §9.6) — misma razón que `onNoteCreated`. */
export const onEvidenceCreated = onDocumentCreated(
  'orders/{orderId}/evidence/{evidenceId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return;
    }
    const orderId = event.params.orderId;
    const orderSnapshot = await getFirestore().collection('orders').doc(orderId).get();
    const orderNumber = orderSnapshot.data()?.['orderNumber'] ?? orderId;
    const clientBusinessName = orderSnapshot.data()?.['clientBusinessName'] ?? '';

    await Promise.all([
      recordOrderEvent({
        orderId,
        action: 'EVIDENCE_UPLOADED',
        description: `Evidencia cargada: ${data['fileName']}`,
        metadata: { evidenceId: event.params.evidenceId, category: data['category'] ?? null },
        createdBy: data['uploadedBy'],
      }),
      notifyAdmins({
        type: 'EVIDENCE_UPLOADED',
        title: `Nueva evidencia en la orden ${orderNumber}`,
        description: `${clientBusinessName} — ${data['fileName']}`,
        entityType: 'ORDER',
        entityId: orderId,
        createdBy: data['uploadedBy'],
      }),
    ]);
  },
);

/** Cambio de estado de una orden — se dispara y aborta si `status` no cambió. */
export const onOrderStatusChanged = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before['status'] === after['status']) {
    return;
  }
  const orderId = event.params.orderId;
  const orderNumber = after['orderNumber'] ?? orderId;
  const updatedBy = after['updatedBy'] ?? 'system';
  const description = `Estado cambiado de ${before['status']} a ${after['status']}`;

  await Promise.all([
    recordOrderEvent({
      orderId,
      action: 'ORDER_STATUS_CHANGED',
      description,
      metadata: { from: before['status'], to: after['status'] },
      createdBy: updatedBy,
    }),
    notifyAdmins({
      type: 'ORDER_STATUS_CHANGED',
      title: `Orden ${orderNumber} actualizada`,
      description,
      entityType: 'ORDER',
      entityId: orderId,
      createdBy: updatedBy,
    }),
  ]);
});

/** Reasignación de técnicos — independiente de `onOrderStatusChanged`.
 * También repara órdenes históricas que tienen ids asignados pero no los
 * nombres denormalizados que necesita el portal cliente (VIEWER no puede
 * leer el directorio global de `users`). */
export const onOrderAssigned = onDocumentUpdated('orders/{orderId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  const before: string[] = beforeData?.['assignedTechnicianIds'] ?? [];
  const after: string[] = afterData?.['assignedTechnicianIds'] ?? [];
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((id) => !beforeSet.has(id));
  const removed = before.filter((id) => !afterSet.has(id));
  const assignmentChanged = added.length > 0 || removed.length > 0;
  const storedNames: string[] = afterData?.['assignedTechnicianNames'] ?? [];
  const namesNeedSync =
    assignmentChanged ||
    storedNames.length !== after.length ||
    storedNames.some((name) => !name.trim() || name === 'Técnico');
  if (!assignmentChanged && !namesNeedSync) {
    return;
  }
  const orderId = event.params.orderId;
  const orderNumber = afterData?.['orderNumber'] ?? orderId;
  const updatedBy = afterData?.['updatedBy'] ?? 'system';
  const tasks: Promise<unknown>[] = [];

  if (namesNeedSync) {
    const firestore = getFirestore();
    const userSnapshots = await Promise.all(
      after.map((uid) => firestore.collection('users').doc(uid).get()),
    );
    const resolvedNames = userSnapshots.map(
      (snapshot, index) =>
        (snapshot.data()?.['displayName'] as string | undefined) ??
        storedNames[index] ??
        'Técnico asignado',
    );
    tasks.push(event.data!.after.ref.update({ assignedTechnicianNames: resolvedNames }));
  }

  if (assignmentChanged) {
    tasks.push(recordOrderEvent({
      orderId,
      action: 'ORDER_ASSIGNED',
      description: 'Técnicos asignados actualizados',
      metadata: { added, removed },
      createdBy: updatedBy,
    }));
    tasks.push(notifyAdmins({
      type: 'ORDER_ASSIGNED',
      title: `Técnicos actualizados en la orden ${orderNumber}`,
      description:
        added.length > 0
          ? `Se asignaron ${added.length} técnico(s)`
          : 'Se removieron técnicos asignados',
      entityType: 'ORDER',
      entityId: orderId,
      createdBy: updatedBy,
    }));
  }

  await Promise.all(tasks);
});

/** Cambio de estado de una cotización (CLAUDE.md §9.4) — misma razón que `onOrderStatusChanged`;
 *  sin bitácora por cotización (no existe ni se pidió), solo notifica. */
export const onQuoteStatusChanged = onDocumentUpdated('quotes/{quoteId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before['status'] === after['status']) {
    return;
  }
  const quoteNumber = after['quoteNumber'] ?? event.params.quoteId;
  const clientBusinessName = after['clientBusinessName'] ?? '';

  await notifyAdmins({
    type: 'QUOTE_STATUS_CHANGED',
    title: `Cotización ${quoteNumber} actualizada`,
    description: `${clientBusinessName} — estado cambiado de ${before['status']} a ${after['status']}`,
    entityType: 'QUOTE',
    entityId: event.params.quoteId,
    createdBy: after['updatedBy'] ?? 'system',
  });
});

const GEMINI_MODEL = 'gemini-1.5-flash';
const CLOSING_ACT_PROMPT_VERSION = 'closing-act-v1';

// CLAUDE.md §12.4 — el prompt se versiona explícitamente junto con la
// respuesta guardada, para poder auditar qué instrucciones lo generaron.
const SYSTEM_PROMPT = `
Actúas como asistente de redacción técnica para una empresa HSEQ.

Tu tarea es transformar notas de campo en un borrador formal y corporativo.
No inventes hechos, mediciones, normas, fechas, personas ni conclusiones.
Conserva el significado original.
Cuando la información sea insuficiente, indícalo explícitamente.
Separa actividades, hallazgos, recomendaciones, conclusiones y limitaciones.
Devuelve únicamente JSON válido con este esquema exacto:
{
  "executiveSummary": string,
  "performedActivities": string[],
  "findings": string[],
  "recommendations": string[],
  "conclusions": string,
  "limitations": string
}
`.trim();

interface ClosingActDraft {
  executiveSummary: string;
  performedActivities: string[];
  findings: string[];
  recommendations: string[];
  conclusions?: string;
  limitations?: string;
}

interface GenerateClosingActRequest {
  orderId: string;
  notes: string;
}

interface ClosingActContentInput {
  objective?: string;
  executiveSummary: string;
  performedActivities: string[];
  findings: string[];
  recommendations: string[];
  conclusions?: string;
  limitations?: string;
  acceptanceNotes?: string;
  serviceProviderRepresentative?: string;
  serviceProviderRepresentativeRole?: string;
  clientRepresentative?: string;
  clientRepresentativeRole?: string;
}

interface CreateClosingActRequest {
  orderId: string;
  content: ClosingActContentInput;
}

interface UploadClosingActRequest {
  orderId: string;
  fileName: string;
  contentType: string;
  fileBase64: string;
}

const MAX_CLOSING_ACT_PDF_SIZE = 10 * 1024 * 1024;

async function prepareClosingActContext(uid: string, orderId: string) {
  const role = await requireRole(uid, ['ADMIN', 'COORDINATOR', 'TECHNICIAN']);
  const firestore = getFirestore();
  const orderRef = firestore.collection('orders').doc(orderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) {
    throw new HttpsError('not-found', 'La orden no existe.');
  }
  const order = orderSnapshot.data() ?? {};
  if (order['status'] !== 'UNDER_REVIEW') {
    throw new HttpsError('failed-precondition', 'La orden debe estar en revisión para crear el acta.');
  }
  if (
    role === 'TECHNICIAN' &&
    !((order['assignedTechnicianIds'] as string[] | undefined) ?? []).includes(uid)
  ) {
    throw new HttpsError('permission-denied', 'La orden no está asignada a este técnico.');
  }
  const priorActsSnapshot = await firestore
    .collection('closingActs')
    .where('orderId', '==', orderId)
    .get();
  return {
    firestore,
    orderRef,
    order,
    nextVersion: priorActsSnapshot.size + 1,
  };
}

function cleanOptionalText(value: unknown, maxLength = 4000): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function cleanTextList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 1000))
    .filter(Boolean)
    .slice(0, 100);
}

function parseClosingActDraft(rawText: string): ClosingActDraft {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new HttpsError('internal', 'La IA no devolvió un JSON válido.');
  }

  let parsed: Partial<ClosingActDraft>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new HttpsError('internal', 'La IA no devolvió un JSON válido.');
  }

  if (!parsed.executiveSummary || !Array.isArray(parsed.findings)) {
    throw new HttpsError('internal', 'La respuesta de la IA no cumple el esquema esperado.');
  }

  return {
    executiveSummary: parsed.executiveSummary,
    performedActivities: parsed.performedActivities ?? [],
    findings: parsed.findings,
    recommendations: parsed.recommendations ?? [],
    conclusions: parsed.conclusions,
    limitations: parsed.limitations,
  };
}

/**
 * Genera el borrador del acta de cierre con IA a partir de las notas de
 * campo de una orden, y lo guarda como un nuevo documento en `closingActs`.
 * La IA nunca cierra la orden (CLAUDE.md §23.6/§29): el resultado siempre
 * queda sujeto a revisión y aprobación humana antes del cierre definitivo.
 */
export const generateClosingAct = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para generar el acta.');
  }

  const { orderId, notes } = (request.data ?? {}) as Partial<GenerateClosingActRequest>;
  if (!orderId || !notes || notes.trim().length < 10) {
    throw new HttpsError(
      'invalid-argument',
      'Las notas de campo son insuficientes para procesar el acta.',
    );
  }

  // Además del rol, el backend verifica estado y asignación del técnico;
  // nunca confía únicamente en que la UI haya ocultado la acción.
  const { firestore, orderRef, order, nextVersion } = await prepareClosingActContext(
    request.auth.uid,
    orderId,
  );

  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new HttpsError(
      'failed-precondition',
      'La generación con IA todavía no está configurada en este entorno.',
    );
  }
  const ai = new GoogleGenAI({ apiKey });

  let draft: ClosingActDraft;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${SYSTEM_PROMPT}\n\nNotas de campo:\n${notes}`,
    });
    draft = parseClosingActDraft(response.text ?? '');
  } catch (error) {
    console.error('Error generando el acta con Gemini:', error);
    throw new HttpsError('internal', 'Error al procesar el documento con inteligencia artificial.');
  }

  const closingActRef = firestore.collection('closingActs').doc();
  await closingActRef.set({
    orderId,
    version: nextVersion,
    status: 'AI_GENERATED',
    source: 'AI_ASSISTED',
    title: `Acta de cierre - ${order['orderNumber'] ?? orderId}`,
    executiveSummary: draft.executiveSummary,
    performedActivities: draft.performedActivities,
    findings: draft.findings,
    recommendations: draft.recommendations,
    conclusions: draft.conclusions ?? null,
    limitations: draft.limitations ?? null,
    generatedText: JSON.stringify(draft),
    modelName: GEMINI_MODEL,
    promptVersion: CLOSING_ACT_PROMPT_VERSION,
    generatedAt: FieldValue.serverTimestamp(),
    generatedBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: request.auth.uid,
  });

  await orderRef.update({
    technicalNotes: notes,
    closingActId: closingActRef.id,
    status: 'UNDER_REVIEW',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: request.auth.uid,
  });

  return { closingActId: closingActRef.id };
});

/** Crea el modelo estructurado de acta diligenciado por una persona. El
 * documento queda en revisión; la aprobación y el cierre son pasos humanos
 * posteriores e independientes. */
export const createClosingAct = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear el acta.');
  }
  const { orderId, content } = (request.data ?? {}) as Partial<CreateClosingActRequest>;
  if (!orderId || !content) {
    throw new HttpsError('invalid-argument', 'Falta la orden o el contenido del acta.');
  }
  const executiveSummary = cleanOptionalText(content.executiveSummary);
  const performedActivities = cleanTextList(content.performedActivities);
  if (!executiveSummary || executiveSummary.length < 10 || performedActivities.length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'Registra un resumen y al menos una actividad realizada.',
    );
  }

  const { firestore, orderRef, order, nextVersion } = await prepareClosingActContext(
    request.auth.uid,
    orderId,
  );
  const actRef = firestore.collection('closingActs').doc();
  const now = FieldValue.serverTimestamp();
  const batch = firestore.batch();
  batch.set(actRef, {
    orderId,
    version: nextVersion,
    status: 'UNDER_REVIEW',
    source: 'MANUAL',
    title: `Acta de cierre - ${order['orderNumber'] ?? orderId}`,
    objective: cleanOptionalText(content.objective),
    executiveSummary,
    performedActivities,
    findings: cleanTextList(content.findings),
    recommendations: cleanTextList(content.recommendations),
    conclusions: cleanOptionalText(content.conclusions),
    limitations: cleanOptionalText(content.limitations),
    acceptanceNotes: cleanOptionalText(content.acceptanceNotes),
    serviceProviderRepresentative: cleanOptionalText(
      content.serviceProviderRepresentative,
      200,
    ),
    serviceProviderRepresentativeRole: cleanOptionalText(
      content.serviceProviderRepresentativeRole,
      200,
    ),
    clientRepresentative: cleanOptionalText(content.clientRepresentative, 200),
    clientRepresentativeRole: cleanOptionalText(content.clientRepresentativeRole, 200),
    createdAt: now,
    createdBy: request.auth.uid,
    updatedAt: now,
    updatedBy: request.auth.uid,
  });
  batch.update(orderRef, {
    closingActId: actRef.id,
    updatedAt: now,
    updatedBy: request.auth.uid,
  });
  await batch.commit();
  return { closingActId: actRef.id };
});

/** Registra un PDF de acta ya elaborado o firmado. Storage continúa
 * cerrado al navegador: el archivo entra por esta función autenticada y el
 * documento queda sujeto al mismo paso de aprobación que un acta manual. */
export const uploadClosingAct = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para subir el acta.');
  }
  const { orderId, fileName, contentType, fileBase64 } = (request.data ??
    {}) as Partial<UploadClosingActRequest>;
  if (!orderId || !fileName || !fileBase64 || contentType !== 'application/pdf') {
    throw new HttpsError('invalid-argument', 'Selecciona un archivo PDF válido.');
  }
  const pdfBuffer = Buffer.from(fileBase64, 'base64');
  if (
    pdfBuffer.length === 0 ||
    pdfBuffer.length > MAX_CLOSING_ACT_PDF_SIZE ||
    pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-'
  ) {
    throw new HttpsError('invalid-argument', 'El PDF es inválido o supera el máximo de 10 MB.');
  }

  const { firestore, orderRef, order, nextVersion } = await prepareClosingActContext(
    request.auth.uid,
    orderId,
  );
  const actRef = firestore.collection('closingActs').doc();
  const orderNumber = order['orderNumber'] ?? orderId;
  const pdfPath = `closing-acts/${actRef.id}/acta-cargada-${orderNumber}.pdf`;
  const downloadToken = randomUUID();
  const bucket = getStorage().bucket();
  await bucket.file(pdfPath).save(pdfBuffer, {
    contentType: 'application/pdf',
    metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
  });
  const pdfUrl = buildDownloadUrl(bucket.name, pdfPath, downloadToken);
  const now = FieldValue.serverTimestamp();
  const batch = firestore.batch();
  batch.set(actRef, {
    orderId,
    version: nextVersion,
    status: 'UNDER_REVIEW',
    source: 'UPLOADED',
    title: `Acta de cierre - ${orderNumber}`,
    executiveSummary: 'Acta elaborada externamente y cargada en formato PDF.',
    performedActivities: [],
    findings: [],
    recommendations: [],
    uploadedFileName: fileName.trim().slice(0, 200),
    uploadedFileSize: pdfBuffer.length,
    pdfPath,
    pdfUrl,
    createdAt: now,
    createdBy: request.auth.uid,
    updatedAt: now,
    updatedBy: request.auth.uid,
  });
  batch.update(orderRef, {
    closingActId: actRef.id,
    updatedAt: now,
    updatedBy: request.auth.uid,
  });
  await batch.commit();
  return { closingActId: actRef.id, pdfUrl };
});

interface CloseOrderRequest {
  orderId: string;
  actId: string;
}

interface ReviewClosingActAsClientRequest extends CloseOrderRequest {
  decision: 'ACCEPT' | 'REQUEST_CHANGES';
  representativeName: string;
  representativeRole: string;
  comment?: string;
  acceptedTerms?: boolean;
}

function formatPdfDate(value: unknown): string {
  const date =
    value && typeof (value as { toDate?: unknown }).toDate === 'function'
      ? (value as { toDate: () => Date }).toDate()
      : value instanceof Date
        ? value
        : null;
  return date
    ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '—';
}

function buildClosingActPdf(
  act: FirebaseFirestore.DocumentData,
  order: FirebaseFirestore.DocumentData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const section = (heading: string, body: string | string[]) => {
      doc.moveDown().fontSize(12).font('Helvetica-Bold').text(heading);
      doc.fontSize(10).font('Helvetica');
      if (Array.isArray(body)) {
        if (body.length === 0) {
          doc.text('— Sin información registrada —', { oblique: true });
        } else {
          body.forEach((item) => doc.text(`• ${item}`));
        }
      } else {
        doc.text(body || '— Sin información registrada —');
      }
    };

    const orderNumber = order['orderNumber'] ?? act['orderId'] ?? '—';
    doc.rect(0, 0, doc.page.width, 112).fill('#11047A');
    doc
      .fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('SOTER HSEQ', 50, 30);
    doc
      .fontSize(20)
      .text(act['title'] ?? `Acta de cierre - ${orderNumber}`, 50, 51, {
        width: doc.page.width - 100,
      });
    doc.fontSize(9).font('Helvetica').text(`Orden de trabajo ${orderNumber}`, 50, 83);
    doc.fillColor('#000000');

    doc.y = 138;
    doc.fontSize(11).font('Helvetica-Bold').text('Identificación del servicio');
    doc.moveDown(0.45).fontSize(9).font('Helvetica');
    doc.text(`Cliente: ${order['clientBusinessName'] ?? '—'}`);
    doc.text(`Servicio: ${order['serviceSummary'] ?? order['title'] ?? '—'}`);
    doc.text(`Visita programada: ${formatPdfDate(order['scheduledStart'])}`);
    doc.text(`Técnicos responsables: ${((order['assignedTechnicianNames'] as string[] | undefined) ?? []).join(', ') || '—'}`);

    section('Objetivo y alcance', act['objective'] ?? '');
    section('Resumen ejecutivo', act['executiveSummary'] ?? '');
    section('Actividades realizadas', (act['performedActivities'] as string[]) ?? []);
    section('Hallazgos', (act['findings'] as string[]) ?? []);
    section('Recomendaciones', (act['recommendations'] as string[]) ?? []);
    section('Conclusiones', act['conclusions'] ?? '');
    section('Limitaciones', act['limitations'] ?? '');
    section('Observaciones de aceptación', act['acceptanceNotes'] ?? '');

    doc.moveDown(2);
    const signatureY = doc.y;
    const signatureWidth = (doc.page.width - 120) / 2;
    doc
      .moveTo(50, signatureY)
      .lineTo(50 + signatureWidth, signatureY)
      .strokeColor('#777777')
      .stroke();
    doc
      .moveTo(70 + signatureWidth, signatureY)
      .lineTo(70 + signatureWidth * 2, signatureY)
      .stroke();
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
    doc.text(act['serviceProviderRepresentative'] ?? 'Responsable SOTER HSEQ', 50, signatureY + 8, {
      width: signatureWidth,
      align: 'center',
    });
    doc.text(act['clientRepresentative'] ?? 'Representante del cliente', 70 + signatureWidth, signatureY + 8, {
      width: signatureWidth,
      align: 'center',
    });
    doc.font('Helvetica').fontSize(8).fillColor('#666666');
    doc.text(act['serviceProviderRepresentativeRole'] ?? 'Nombre, cargo y firma', 50, signatureY + 22, {
      width: signatureWidth,
      align: 'center',
    });
    doc.text(act['clientRepresentativeRole'] ?? 'Nombre, cargo y firma', 70 + signatureWidth, signatureY + 22, {
      width: signatureWidth,
      align: 'center',
    });

    if (act['clientDecision'] === 'ACCEPTED') {
      section('Constancia de aceptación digital', [
        `Representante: ${act['clientDecisionByName'] ?? '—'}`,
        `Cargo: ${act['clientDecisionByRole'] ?? '—'}`,
        `Fecha de aceptación: ${formatPdfDate(act['clientDecisionAt'])}`,
        `Usuario autenticado: ${act['clientDecisionBy'] ?? '—'}`,
        `Versión del acta aceptada: ${act['version'] ?? '—'}`,
        act['clientDecisionComment']
          ? `Observaciones: ${act['clientDecisionComment']}`
          : 'Sin observaciones adicionales.',
      ]);
      doc
        .moveDown(0.5)
        .fontSize(8)
        .fillColor('#666666')
        .text(
          'Esta constancia registra una aceptación operacional realizada por un usuario autenticado del portal cliente.',
        );
    }

    doc.end();
  });
}

/**
 * Decisión del cliente sobre un acta aprobada internamente. El Admin SDK
 * escribe el resultado porque el portal cliente conserva acceso de solo
 * lectura sobre actas y órdenes. Aceptar genera el PDF final y cierra la
 * orden; solicitar cambios devuelve la orden al circuito de corrección.
 */
export const reviewClosingActAsClient = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para revisar el acta.');
  }

  const {
    orderId,
    actId,
    decision,
    representativeName,
    representativeRole,
    comment,
    acceptedTerms,
  } = (request.data ?? {}) as Partial<ReviewClosingActAsClientRequest>;
  if (!orderId || !actId || !decision || !['ACCEPT', 'REQUEST_CHANGES'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'La decisión sobre el acta no es válida.');
  }

  const cleanRepresentativeName = cleanOptionalText(representativeName, 120);
  const cleanRepresentativeRole = cleanOptionalText(representativeRole, 120);
  const cleanComment = cleanOptionalText(comment, 1000);
  if (!cleanRepresentativeName || !cleanRepresentativeRole) {
    throw new HttpsError('invalid-argument', 'Registra el nombre y cargo del representante.');
  }
  if (decision === 'REQUEST_CHANGES' && !cleanComment) {
    throw new HttpsError('invalid-argument', 'Explica los cambios que requiere el acta.');
  }
  if (decision === 'ACCEPT' && acceptedTerms !== true) {
    throw new HttpsError('failed-precondition', 'Debes confirmar la declaración de aceptación.');
  }

  const firestore = getFirestore();
  const userRef = firestore.collection('users').doc(request.auth.uid);
  const orderRef = firestore.collection('orders').doc(orderId);
  const actRef = firestore.collection('closingActs').doc(actId);
  const [userSnapshot, orderSnapshot, actSnapshot] = await Promise.all([
    userRef.get(),
    orderRef.get(),
    actRef.get(),
  ]);
  const user = userSnapshot.data() ?? {};
  const order = orderSnapshot.data() ?? {};
  const act = actSnapshot.data() ?? {};

  if (user['role'] !== 'VIEWER' || !user['clientId']) {
    throw new HttpsError('permission-denied', 'Solo un usuario cliente puede revisar el acta.');
  }
  if (!orderSnapshot.exists || order['clientId'] !== user['clientId']) {
    throw new HttpsError('permission-denied', 'La orden no pertenece a tu empresa.');
  }
  if (
    !actSnapshot.exists ||
    act['orderId'] !== orderId ||
    order['closingActId'] !== actId
  ) {
    throw new HttpsError('not-found', 'El acta no existe o no es la vigente para esta orden.');
  }
  if (order['status'] !== 'APPROVED' || act['status'] !== 'APPROVED') {
    throw new HttpsError('failed-precondition', 'El acta ya no está pendiente de tu decisión.');
  }

  const decidedAt = Timestamp.now();
  const clientDecision = decision === 'ACCEPT' ? 'ACCEPTED' : 'CHANGES_REQUESTED';
  const decisionRecord = {
    decision: clientDecision,
    representativeName: cleanRepresentativeName,
    representativeRole: cleanRepresentativeRole,
    comment: cleanComment,
    decidedAt,
    decidedBy: request.auth.uid,
    version: Number(act['version'] ?? 1),
  };
  const decisionFields = {
    clientDecision,
    clientDecisionComment: cleanComment,
    clientDecisionAt: decidedAt,
    clientDecisionBy: request.auth.uid,
    clientDecisionByName: cleanRepresentativeName,
    clientDecisionByRole: cleanRepresentativeRole,
    clientAcceptanceStatementVersion: 'client-acceptance-v1',
    clientDecisions: FieldValue.arrayUnion(decisionRecord),
    updatedAt: decidedAt,
    updatedBy: request.auth.uid,
  };
  const orderNumber = order['orderNumber'] ?? orderId;
  const eventAction: OrderEventAction =
    decision === 'ACCEPT' ? 'CLIENT_ACCEPTED_ACT' : 'CLIENT_REQUESTED_ACT_CHANGES';
  const eventDescription =
    decision === 'ACCEPT'
      ? `Cliente aceptó el acta de la orden ${orderNumber}`
      : `Cliente solicitó cambios al acta de la orden ${orderNumber}`;

  let pdfPath = act['pdfPath'] as string | undefined;
  let pdfUrl = act['pdfUrl'] as string | undefined;
  if (decision === 'ACCEPT' && act['source'] !== 'UPLOADED') {
    const pdfBuffer = await buildClosingActPdf({ ...act, ...decisionFields }, order);
    pdfPath = `closing-acts/${actId}/acta-${orderNumber}.pdf`;
    const downloadToken = randomUUID();
    const bucket = getStorage().bucket();
    await bucket.file(pdfPath).save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
    });
    pdfUrl = buildDownloadUrl(bucket.name, pdfPath, downloadToken);
  }
  if (decision === 'ACCEPT' && (!pdfPath || !pdfUrl)) {
    throw new HttpsError('failed-precondition', 'El acta no tiene un documento PDF válido.');
  }

  const batch = firestore.batch();
  batch.update(
    actRef,
    {
      ...decisionFields,
      status: decision === 'ACCEPT' ? 'FINAL' : 'CHANGES_REQUESTED',
      ...(decision === 'ACCEPT' ? { pdfPath, pdfUrl } : {}),
    },
    { lastUpdateTime: actSnapshot.updateTime! },
  );
  batch.update(
    orderRef,
    {
      status: decision === 'ACCEPT' ? 'CLOSED' : 'CORRECTION_REQUIRED',
      updatedAt: decidedAt,
      updatedBy: request.auth.uid,
    },
    { lastUpdateTime: orderSnapshot.updateTime! },
  );
  const decisionEventData = buildOrderEventData(
    {
      orderId,
      action: eventAction,
      description: eventDescription,
      metadata: {
        actId,
        actVersion: decisionRecord.version,
        decision: clientDecision,
        comment: cleanComment,
        representativeName: cleanRepresentativeName,
        representativeRole: cleanRepresentativeRole,
      },
      createdBy: request.auth.uid,
    },
    decidedAt,
  );
  batch.set(firestore.collection('auditEvents').doc(), decisionEventData);
  batch.set(orderRef.collection('events').doc(), decisionEventData);
  batch.set(firestore.collection('notifications').doc(), {
    type: 'CLOSING_ACT_CLIENT_DECISION',
    title:
      decision === 'ACCEPT'
        ? `Acta aceptada por ${order['clientBusinessName'] ?? 'el cliente'}`
        : `Cambios solicitados por ${order['clientBusinessName'] ?? 'el cliente'}`,
    description: cleanComment || `Orden ${orderNumber}`,
    entityType: 'ORDER',
    entityId: orderId,
    createdBy: request.auth.uid,
    readBy: [],
    dismissedBy: [],
    createdAt: decidedAt,
  });
  await batch.commit();

  return { decision: clientDecision, ...(pdfUrl ? { pdfUrl } : {}) };
});

/**
 * Cierre definitivo (CLAUDE.md §11.6/§23.7): genera el PDF final del acta
 * aprobada, lo guarda en Storage, marca el acta como `FINAL` y la orden
 * como `CLOSED`, y deja un evento auditado. Todo en el backend porque
 * escribe en rutas que las reglas del cliente bloquean a propósito.
 */
export const closeOrder = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para cerrar la orden.');
  }
  // Solo coordinador/admin cierran (CLAUDE.md §3.1/§3.3).
  await requireRole(request.auth.uid, ['ADMIN', 'COORDINATOR']);

  const { orderId, actId } = (request.data ?? {}) as Partial<CloseOrderRequest>;
  if (!orderId || !actId) {
    throw new HttpsError('invalid-argument', 'Falta la orden o el acta a cerrar.');
  }

  const firestore = getFirestore();
  const orderRef = firestore.collection('orders').doc(orderId);
  const actRef = firestore.collection('closingActs').doc(actId);
  const [orderSnapshot, actSnapshot] = await Promise.all([orderRef.get(), actRef.get()]);

  if (!orderSnapshot.exists) {
    throw new HttpsError('not-found', 'La orden no existe.');
  }
  if (!actSnapshot.exists || actSnapshot.data()?.['orderId'] !== orderId) {
    throw new HttpsError('not-found', 'El acta no existe o no pertenece a esta orden.');
  }
  // No cerrar sin acta aprobada (CLAUDE.md §10.2/§23.7).
  if (actSnapshot.data()?.['status'] !== 'APPROVED') {
    throw new HttpsError('failed-precondition', 'El acta debe estar aprobada antes de cerrar la orden.');
  }

  const order = orderSnapshot.data() ?? {};
  const act = actSnapshot.data() ?? {};
  const orderNumber = order['orderNumber'] ?? orderId;
  let pdfPath = act['pdfPath'] as string | undefined;
  let pdfUrl = act['pdfUrl'] as string | undefined;

  // Un acta cargada ya es el documento oficial; no se sustituye por un PDF
  // vacío generado desde los campos estructurados. Las actas manuales o de
  // IA sí se renderizan con el modelo corporativo de SOTER.
  if (act['source'] !== 'UPLOADED') {
    const pdfBuffer = await buildClosingActPdf(act, order);
    pdfPath = `closing-acts/${actId}/acta-${orderNumber}.pdf`;
    const downloadToken = randomUUID();
    const bucket = getStorage().bucket();
    await bucket.file(pdfPath).save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
    });
    pdfUrl = buildDownloadUrl(bucket.name, pdfPath, downloadToken);
  }
  if (!pdfPath || !pdfUrl) {
    throw new HttpsError('failed-precondition', 'El acta cargada no tiene un PDF válido.');
  }

  const now = FieldValue.serverTimestamp();
  const batch = firestore.batch();
  batch.update(actRef, {
    status: 'FINAL',
    pdfPath,
    pdfUrl,
    updatedAt: now,
    updatedBy: request.auth.uid,
  });
  batch.update(orderRef, { status: 'CLOSED', updatedAt: now, updatedBy: request.auth.uid });
  // Se escribe en ambas colecciones: `auditEvents` es la bitácora global
  // (CLAUDE.md §9.9, solo ADMIN/COORDINATOR), y `orders/{orderId}/events`
  // es lo que lee el feed de Actividad de la orden — mismo evento normalizado.
  const closingEventData = buildOrderEventData(
    {
      orderId,
      action: 'ORDER_CLOSED',
      description: `Orden ${orderNumber} cerrada`,
      metadata: { actId },
      createdBy: request.auth.uid,
    },
    now,
  );
  batch.set(firestore.collection('auditEvents').doc(), closingEventData);
  batch.set(orderRef.collection('events').doc(), closingEventData);
  await batch.commit();

  return { pdfPath, pdfUrl };
});

interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  specialty?: string;
  role: Role;
}

/**
 * Crea una cuenta de Firebase Auth + su documento en `users` en el mismo
 * paso. No se puede crear un usuario de Auth para otra persona desde el
 * cliente (el SDK solo gestiona la sesión propia) — por eso pasa por acá,
 * con el Admin SDK, igual que `scripts/seed-emulator.ts` para los usuarios
 * de demo. `firestore.rules` bloquea `create` en `users` a propósito
 * (`if false`, ver el comentario ahí) — esta función es el único camino.
 */
export const createUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear usuarios.');
  }
  await requireRole(request.auth.uid, ['ADMIN']);

  const { email, password, displayName, phone, specialty, role } = (request.data ??
    {}) as Partial<CreateUserRequest>;
  if (!email || !password || !displayName || !role) {
    throw new HttpsError('invalid-argument', 'Faltan datos obligatorios para crear el usuario.');
  }
  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
  }

  let authUser;
  try {
    authUser = await getAuth().createUser({ email, password, displayName, emailVerified: true });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.');
    }
    throw new HttpsError('invalid-argument', 'No se pudo crear la cuenta con esos datos.');
  }

  const now = FieldValue.serverTimestamp();
  await getFirestore()
    .collection('users')
    .doc(authUser.uid)
    .set({
      uid: authUser.uid,
      displayName,
      email,
      phone: phone ?? null,
      specialty: specialty ?? null,
      role,
      status: 'ACTIVE',
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    });

  return { uid: authUser.uid };
});

interface DeleteUserRequest {
  uid: string;
}

/**
 * Elimina la cuenta de Auth Y el documento de `users` en el mismo paso.
 * `firestore.rules` bloquea `delete` en `users` a propósito (ver el
 * comentario ahí) — borrar solo el documento dejaría la cuenta de Auth
 * viva (podría seguir iniciando sesión sin perfil), así que esto también
 * necesita el Admin SDK, igual que `createUser`. No falla si el usuario
 * tiene órdenes asignadas: `assignedTechnicianIds` no se limpia (seguiría
 * "asignado" a un uid que ya no existe), pero `OrdersFacade.technicianName`
 * ya tiene un fallback genérico ("Técnico") para un id sin match, mismo
 * criterio ya aceptado para `ClientsService.deleteClient`.
 */
export const deleteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para eliminar usuarios.');
  }
  await requireRole(request.auth.uid, ['ADMIN']);

  const { uid } = (request.data ?? {}) as Partial<DeleteUserRequest>;
  if (!uid) {
    throw new HttpsError('invalid-argument', 'Falta el usuario a eliminar.');
  }
  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'No puedes eliminar tu propia cuenta.');
  }

  await getFirestore().collection('users').doc(uid).delete();
  await getAuth()
    .deleteUser(uid)
    .catch((error) => {
      const code = (error as { code?: string }).code;
      if (code !== 'auth/user-not-found') {
        throw error;
      }
    });

  return { uid };
});

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ACCEPTED_PDF_TYPE = 'application/pdf';

type EvidenceCategory = 'BEFORE' | 'DURING' | 'AFTER' | 'FINDING' | 'SUPPORTING_DOCUMENT';

interface UploadEvidenceRequest {
  orderId: string;
  fileName: string;
  contentType: string;
  fileBase64: string;
  category?: EvidenceCategory;
  description?: string;
}

function evidenceTypeFor(contentType: string): 'PHOTO' | 'PDF' | 'OTHER' {
  if (contentType === ACCEPTED_PDF_TYPE) return 'PDF';
  return contentType.startsWith('image/') ? 'PHOTO' : 'OTHER';
}

/**
 * Sube una evidencia con el Admin SDK en vez de dejar que el cliente
 * escriba directo a Storage (ver el comentario de `buildDownloadUrl` más
 * arriba: `storage.rules` deniega todo acceso directo porque la lectura
 * cruzada Storage→Firestore que necesitaría para validar rol/asignación/
 * estado no es confiable en este proyecto). Toda esa validación —antes en
 * `canUploadEvidence` de `storage.rules`— se hace acá, leyendo Firestore
 * directo con el Admin SDK (sin Rules de por medio, siempre funciona).
 */
export const uploadEvidence = onCall(
  { memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión para subir evidencias.');
    }
    const { orderId, fileName, contentType, fileBase64, category, description } =
      (request.data ?? {}) as Partial<UploadEvidenceRequest>;
    if (!orderId || !fileName || !contentType || !fileBase64) {
      throw new HttpsError('invalid-argument', 'Faltan datos para subir la evidencia.');
    }

    const firestore = getFirestore();
    const userSnapshot = await firestore.collection('users').doc(request.auth.uid).get();
    const role = userSnapshot.data()?.['role'] as Role | undefined;
    if (!role || !(['ADMIN', 'COORDINATOR', 'TECHNICIAN'] as Role[]).includes(role)) {
      throw new HttpsError('permission-denied', 'Tu rol no tiene permiso para subir evidencias.');
    }

    const orderRef = firestore.collection('orders').doc(orderId);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists) {
      throw new HttpsError('not-found', 'La orden no existe.');
    }
    const orderData = orderSnapshot.data() ?? {};
    if (orderData['status'] === 'CLOSED') {
      throw new HttpsError(
        'failed-precondition',
        'No se puede subir evidencia a una orden cerrada.',
      );
    }
    if (role === 'TECHNICIAN') {
      const assignedIds = (orderData['assignedTechnicianIds'] as string[] | undefined) ?? [];
      if (!assignedIds.includes(request.auth.uid)) {
        throw new HttpsError('permission-denied', 'No estás asignado a esta orden.');
      }
    }

    const isImage = ACCEPTED_IMAGE_TYPES.has(contentType);
    const isPdf = contentType === ACCEPTED_PDF_TYPE;
    if (!isImage && !isPdf) {
      throw new HttpsError('invalid-argument', 'Formato no permitido. Usa JPEG, PNG, WEBP o PDF.');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(fileBase64, 'base64');
    } catch {
      throw new HttpsError('invalid-argument', 'El archivo enviado no es válido.');
    }
    const maxSize = isPdf ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (buffer.length === 0 || buffer.length > maxSize) {
      throw new HttpsError(
        'invalid-argument',
        `El archivo supera el tamaño máximo (${Math.round(maxSize / 1024 / 1024)} MB).`,
      );
    }

    const evidenceRef = orderRef.collection('evidence').doc();
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const storagePath = `orders/${orderId}/evidence/${evidenceRef.id}/${safeFileName}`;
    const downloadToken = randomUUID();

    const bucket = getStorage().bucket();
    await bucket.file(storagePath).save(buffer, {
      contentType,
      metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
    });
    const downloadUrl = buildDownloadUrl(bucket.name, storagePath, downloadToken);

    const now = FieldValue.serverTimestamp();
    const batch = firestore.batch();
    batch.set(evidenceRef, {
      orderId,
      type: evidenceTypeFor(contentType),
      category: category ?? null,
      fileName,
      storagePath,
      downloadUrl,
      contentType,
      size: buffer.length,
      description: description || null,
      uploadedAt: now,
      uploadedBy: request.auth.uid,
      status: 'ACTIVE',
    });
    batch.update(orderRef, {
      evidenceCount: FieldValue.increment(1),
      updatedAt: now,
      updatedBy: request.auth.uid,
    });
    await batch.commit();

    return { evidenceId: evidenceRef.id, downloadUrl };
  },
);

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);

interface UploadLogoRequest {
  fileName: string;
  contentType: string;
  fileBase64: string;
}

/**
 * Sube el logo de la empresa y actualiza `settings/general.logoUrl` en la
 * misma función — mismo patrón que `uploadEvidence` (Admin SDK, Storage
 * bloqueado para el cliente por `storage.rules`), pero solo ADMIN puede
 * llamarla (CLAUDE.md §3.1).
 */
export const uploadLogo = onCall({ memory: '512MiB', timeoutSeconds: 60 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para subir el logo.');
  }
  await requireRole(request.auth.uid, ['ADMIN']);

  const { fileName, contentType, fileBase64 } = (request.data ?? {}) as Partial<UploadLogoRequest>;
  if (!fileName || !contentType || !fileBase64) {
    throw new HttpsError('invalid-argument', 'Faltan datos para subir el logo.');
  }
  if (!ACCEPTED_LOGO_TYPES.has(contentType)) {
    throw new HttpsError('invalid-argument', 'Formato no permitido. Usa PNG, JPG o SVG.');
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileBase64, 'base64');
  } catch {
    throw new HttpsError('invalid-argument', 'El archivo enviado no es válido.');
  }
  if (buffer.length === 0 || buffer.length > MAX_LOGO_SIZE_BYTES) {
    throw new HttpsError(
      'invalid-argument',
      `El archivo supera el tamaño máximo (${Math.round(MAX_LOGO_SIZE_BYTES / 1024 / 1024)} MB).`,
    );
  }

  const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const storagePath = `settings/logo/${safeFileName}`;
  const downloadToken = randomUUID();

  const bucket = getStorage().bucket();
  await bucket.file(storagePath).save(buffer, {
    contentType,
    metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
  });
  const logoUrl = buildDownloadUrl(bucket.name, storagePath, downloadToken);

  await getFirestore()
    .collection('settings')
    .doc('general')
    .set(
      { logoUrl, updatedAt: FieldValue.serverTimestamp(), updatedBy: request.auth.uid },
      { merge: true },
    );

  return { logoUrl };
});
