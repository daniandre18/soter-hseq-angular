import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { FIREBASE_FIRESTORE } from '../../../core/firebase/firebase.tokens';
import { QuotesStore } from './quotes.store';
import type { NewQuote, NewQuoteItem, Quote, QuoteItem, QuoteStatus } from '../models/quote.model';

function toDate(value: Timestamp | undefined): Date | undefined {
  return value ? value.toDate() : undefined;
}

function toQuote(id: string, data: DocumentData): Quote {
  return {
    id,
    quoteNumber: data['quoteNumber'],
    clientId: data['clientId'],
    clientBusinessName: data['clientBusinessName'],
    contactId: data['contactId'],
    status: data['status'],
    issueDate: toDate(data['issueDate']) ?? new Date(0),
    validUntil: toDate(data['validUntil']),
    currency: data['currency'],
    subtotal: data['subtotal'],
    tax: data['tax'],
    discount: data['discount'],
    total: data['total'],
    notes: data['notes'],
    terms: data['terms'],
    orderIds: data['orderIds'] ?? [],
    createdAt: toDate(data['createdAt']) ?? new Date(0),
    createdBy: data['createdBy'],
    updatedAt: toDate(data['updatedAt']) ?? new Date(0),
    updatedBy: data['updatedBy'],
  };
}

function toQuoteItem(id: string, data: DocumentData): QuoteItem {
  return {
    id,
    serviceCode: data['serviceCode'],
    description: data['description'],
    quantity: data['quantity'],
    unitPrice: data['unitPrice'],
    taxRate: data['taxRate'],
    subtotal: data['subtotal'],
    total: data['total'],
    position: data['position'],
  };
}

/**
 * Mantiene el QuotesStore de Akita sincronizado con la colección `quotes`
 * (solo campos de resumen; los ítems viven en la subcolección `items` y se
 * consultan aparte, bajo demanda, en `watchItems`).
 */
@Injectable({ providedIn: 'root' })
export class QuotesService {
  private readonly store = inject(QuotesStore);
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  private unsubscribeFromQuotes: Unsubscribe | null = null;
  private quotesRetriedAfterError = false;

  watchQuotes(): void {
    if (this.unsubscribeFromQuotes) {
      return;
    }

    this.store.setLoading(true);
    this.unsubscribeFromQuotes = onSnapshot(
      collection(this.firestore, 'quotes'),
      (snapshot) => {
        this.quotesRetriedAfterError = false;
        this.store.setError(null);
        this.store.set(snapshot.docs.map((docSnapshot) => toQuote(docSnapshot.id, docSnapshot.data())));
        this.store.setLoading(false);
      },
      (error) => {
        this.store.setError(error.message);
        this.store.setLoading(false);
        // Ver el mismo comentario en OrdersService.watchOrders: sin limpiar
        // el guard, un permission-denied transitorio justo tras el login
        // deja el listener atascado hasta recargar la página.
        this.unsubscribeFromQuotes = null;
        if (error.code === 'permission-denied' && !this.quotesRetriedAfterError) {
          this.quotesRetriedAfterError = true;
          setTimeout(() => this.watchQuotes(), 1000);
        }
      },
    );
  }

  watchItems(quoteId: string): Observable<QuoteItem[]> {
    return new Observable<QuoteItem[]>((subscriber) => {
      return onSnapshot(
        collection(this.firestore, 'quotes', quoteId, 'items'),
        (snapshot) => {
          const items = snapshot.docs
            .map((docSnapshot) => toQuoteItem(docSnapshot.id, docSnapshot.data()))
            .sort((a, b) => a.position - b.position);
          subscriber.next(items);
        },
        (error) => subscriber.error(error),
      );
    });
  }

  /** Genera un consecutivo simple; no está protegido contra carreras entre
   *  usuarios concurrentes (aceptable para el MVP/demo, CLAUDE.md §26). */
  private async nextQuoteNumber(): Promise<string> {
    const snapshot = await getDocs(collection(this.firestore, 'quotes'));
    return `COT-${(snapshot.size + 1).toString().padStart(4, '0')}`;
  }

  async addQuote(data: NewQuote, items: NewQuoteItem[], createdBy: string): Promise<string> {
    const quoteNumber = await this.nextQuoteNumber();
    const quoteRef = doc(collection(this.firestore, 'quotes'));
    const batch = writeBatch(this.firestore);

    batch.set(quoteRef, {
      quoteNumber,
      clientId: data.clientId,
      clientBusinessName: data.clientBusinessName,
      status: 'DRAFT' satisfies QuoteStatus,
      issueDate: serverTimestamp(),
      validUntil: data.validUntil ?? null,
      currency: data.currency,
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      total: data.total,
      notes: data.notes ?? null,
      createdAt: serverTimestamp(),
      createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: createdBy,
    });

    items.forEach((item) => {
      const itemRef = doc(collection(this.firestore, 'quotes', quoteRef.id, 'items'));
      batch.set(itemRef, item);
    });

    await batch.commit();
    return quoteRef.id;
  }

  async updateStatus(quoteId: string, status: QuoteStatus, updatedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'quotes', quoteId), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  /**
   * Convierte una cotización APPROVED en una orden por cada ítem/servicio
   * (CLAUDE.md §11.3) — no en una sola orden colapsada: cada servicio se
   * ejecuta y rastrea de forma independiente (su propio estado, técnico,
   * evidencia y acta), ver `OrdersService.createOrders`, que usa el mismo
   * criterio para la creación manual. Idempotente: una transacción verifica
   * dentro de la misma lectura que la cotización siga aprobada y sin
   * `orderIds` antes de escribir.
   */
  async convertToOrder(quoteId: string, userId: string): Promise<string[]> {
    const quoteRef = doc(this.firestore, 'quotes', quoteId);
    const ordersCollection = collection(this.firestore, 'orders');

    // Los ítems y el consecutivo se leen antes de la transacción: las
    // lecturas de una transacción de Firestore deben hacerse todas con
    // `transaction.get()` antes de cualquier escritura, así que una
    // subcolección/conteo aparte no pertenece ahí (misma limitación de
    // carrera que `nextQuoteNumber`, aceptable para el MVP).
    const itemsSnapshot = await getDocs(collection(this.firestore, 'quotes', quoteId, 'items'));
    const items = itemsSnapshot.docs
      .map((itemDoc) => toQuoteItem(itemDoc.id, itemDoc.data()))
      .sort((a, b) => a.position - b.position);

    const ordersSnapshot = await getDocs(ordersCollection);
    const startingNumber = ordersSnapshot.size + 1;
    const orderRefs = items.map(() => doc(ordersCollection));

    await runTransaction(this.firestore, async (transaction) => {
      const quoteSnapshot = await transaction.get(quoteRef);
      if (!quoteSnapshot.exists()) {
        throw new Error('La cotización no existe.');
      }
      const quote = quoteSnapshot.data();
      if (quote['status'] !== 'APPROVED') {
        throw new Error('Solo una cotización aprobada puede convertirse en orden.');
      }
      if ((quote['orderIds'] as string[] | undefined)?.length) {
        throw new Error('Esta cotización ya fue convertida en orden.');
      }
      if (items.length === 0) {
        throw new Error('La cotización no tiene servicios para convertir.');
      }

      items.forEach((item, index) => {
        const orderNumber = `OT-${(startingNumber + index).toString().padStart(4, '0')}`;
        const serviceSummary = item.description;
        transaction.set(orderRefs[index], {
          orderNumber,
          quoteId,
          quoteNumber: quote['quoteNumber'],
          clientId: quote['clientId'],
          clientBusinessName: quote['clientBusinessName'],
          assignedTechnicianIds: [],
          status: 'DRAFT',
          title: serviceSummary,
          serviceSummary,
          priority: 'MEDIUM',
          progress: 0,
          evidenceCount: 0,
          createdAt: serverTimestamp(),
          createdBy: userId,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        });
      });

      transaction.update(quoteRef, {
        status: 'CONVERTED',
        orderIds: orderRefs.map((ref) => ref.id),
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
    });

    return orderRefs.map((ref) => ref.id);
  }
}
