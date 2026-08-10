import type { DocumentData } from 'firebase/firestore';
import { ORDER_STATUS_CONFIG } from '../../../features/orders/models/order-status-config';
import type { OrderStatus, ServiceOrder } from '../../../features/orders/models/order.model';
import { toDate, toDateOrDefault } from './firestore.mapper';

/** Normaliza un documento de Firestore sin filtrar tipos del SDK al dominio. */
export function toServiceOrder(id: string, data: DocumentData): ServiceOrder {
  const status: OrderStatus = data['status'];
  return {
    id,
    orderNumber: data['orderNumber'],
    quoteId: data['quoteId'],
    quoteNumber: data['quoteNumber'],
    clientId: data['clientId'],
    clientBusinessName: data['clientBusinessName'],
    assignedTechnicianIds: data['assignedTechnicianIds'] ?? [],
    assignedTechnicianNames: data['assignedTechnicianNames'] ?? [],
    coordinatorId: data['coordinatorId'],
    title: data['title'] ?? data['serviceSummary'] ?? '',
    priority: data['priority'] ?? 'MEDIUM',
    dueDate: toDate(data['dueDate']),
    description: data['description'] ?? undefined,
    progress: data['progress'] ?? ORDER_STATUS_CONFIG[status]?.progress ?? 0,
    scheduledStart: toDate(data['scheduledStart']),
    scheduledEnd: toDate(data['scheduledEnd']),
    actualStart: toDate(data['actualStart']),
    actualEnd: toDate(data['actualEnd']),
    serviceAddress: data['serviceAddress'],
    city: data['city'],
    status,
    serviceSummary: data['serviceSummary'],
    technicalNotes: data['technicalNotes'],
    findings: data['findings'],
    recommendations: data['recommendations'],
    evidenceCount: data['evidenceCount'] ?? 0,
    closingActId: data['closingActId'],
    createdAt: toDateOrDefault(data['createdAt']),
    createdBy: data['createdBy'],
    updatedAt: toDateOrDefault(data['updatedAt']),
    updatedBy: data['updatedBy'],
  };
}
