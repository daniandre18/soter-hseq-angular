import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { GoogleGenAI } from '@google/genai';
import PDFDocument from 'pdfkit';

initializeApp();

type Role = 'ADMIN' | 'COMMERCIAL' | 'COORDINATOR' | 'TECHNICIAN' | 'VIEWER';

/**
 * El Admin SDK ignora las Firestore Rules, así que cualquier función que
 * escriba datos sensibles debe validar el rol por su cuenta leyendo el
 * documento de `users` (CLAUDE.md §13.1: "nunca confiar en el rol enviado
 * por el cliente" — aquí se resuelve siempre desde Firestore, no de
 * `request.data`).
 */
async function requireRole(uid: string, allowedRoles: Role[]): Promise<void> {
  const userDoc = await getFirestore().collection('users').doc(uid).get();
  const role = userDoc.data()?.['role'] as Role | undefined;
  if (!role || !allowedRoles.includes(role)) {
    throw new HttpsError('permission-denied', 'Tu rol no tiene permiso para esta acción.');
  }
}

// `defineString` (no `defineSecret`): para el MVP local con el Emulator
// Suite y un proyecto "demo-" ficticio no hay cuenta de Google Cloud real
// contra la cual resolver Secret Manager. En producción esto debe migrar a
// `firebase functions:secrets:set GEMINI_API_KEY` (CLAUDE.md §13.5).
const geminiApiKey = defineString('GEMINI_API_KEY');
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
  // CLAUDE.md §23.6 "solo usuarios autorizados generan"; el técnico debe
  // poder solicitarlo (§3.4), no solo ADMIN/COORDINATOR.
  await requireRole(request.auth.uid, ['ADMIN', 'COORDINATOR', 'TECHNICIAN']);

  const { orderId, notes } = (request.data ?? {}) as Partial<GenerateClosingActRequest>;
  if (!orderId || !notes || notes.trim().length < 10) {
    throw new HttpsError(
      'invalid-argument',
      'Las notas de campo son insuficientes para procesar el acta.',
    );
  }

  const firestore = getFirestore();
  const orderRef = firestore.collection('orders').doc(orderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) {
    throw new HttpsError('not-found', 'La orden no existe.');
  }

  const priorActsSnapshot = await firestore
    .collection('closingActs')
    .where('orderId', '==', orderId)
    .get();
  const nextVersion = priorActsSnapshot.size + 1;

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

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
    title: `Acta de cierre - ${orderSnapshot.data()?.['orderNumber'] ?? orderId}`,
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

  return { closingActId: closingActRef.id };
});

interface CloseOrderRequest {
  orderId: string;
  actId: string;
}

function buildClosingActPdf(act: FirebaseFirestore.DocumentData, orderNumber: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
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

    doc.fontSize(18).font('Helvetica-Bold').text(act['title'] ?? `Acta de cierre - ${orderNumber}`);
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text(`Orden ${orderNumber}`);
    doc.fillColor('#000000');

    section('Resumen ejecutivo', act['executiveSummary'] ?? '');
    section('Actividades realizadas', (act['performedActivities'] as string[]) ?? []);
    section('Hallazgos', (act['findings'] as string[]) ?? []);
    section('Recomendaciones', (act['recommendations'] as string[]) ?? []);
    section('Conclusiones', act['conclusions'] ?? '');
    section('Limitaciones', act['limitations'] ?? '');

    doc.end();
  });
}

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

  const orderNumber = orderSnapshot.data()?.['orderNumber'] ?? orderId;
  const pdfBuffer = await buildClosingActPdf(actSnapshot.data() ?? {}, orderNumber);

  const pdfPath = `closing-acts/${actId}/acta-${orderNumber}.pdf`;
  await getStorage().bucket().file(pdfPath).save(pdfBuffer, { contentType: 'application/pdf' });

  const now = FieldValue.serverTimestamp();
  const batch = firestore.batch();
  batch.update(actRef, { status: 'FINAL', pdfPath, updatedAt: now, updatedBy: request.auth.uid });
  batch.update(orderRef, { status: 'CLOSED', updatedAt: now, updatedBy: request.auth.uid });
  batch.set(firestore.collection('auditEvents').doc(), {
    type: 'ORDER_CLOSED',
    orderId,
    actId,
    userId: request.auth.uid,
    timestamp: now,
  });
  await batch.commit();

  return { pdfPath };
});

interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
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

  const { email, password, displayName, phone, role } = (request.data ?? {}) as Partial<CreateUserRequest>;
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
      role,
      status: 'ACTIVE',
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    });

  return { uid: authUser.uid };
});
