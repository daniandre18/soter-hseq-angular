import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { GoogleGenAI } from '@google/genai';

initializeApp();

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
    version: 1,
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
