export type ClosingActStatus = 'DRAFT' | 'AI_GENERATED' | 'UNDER_REVIEW' | 'APPROVED' | 'FINAL';
export type ClosingActSource = 'MANUAL' | 'AI_ASSISTED';

/** Modelo de dominio de la colección `closingActs` (CLAUDE.md §9.8). */
export interface ClosingAct {
  id: string;
  orderId: string;
  version: number;
  status: ClosingActStatus;
  source: ClosingActSource;
  title: string;
  executiveSummary: string;
  performedActivities: string[];
  findings: string[];
  recommendations: string[];
  conclusions?: string;
  limitations?: string;
  modelName?: string;
  promptVersion?: string;
  pdfPath?: string;
  pdfUrl?: string;
  generatedAt?: Date;
  generatedBy?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/** Campos editables por el coordinador al revisar el borrador (CLAUDE.md §11.6). */
export type ClosingActContent = Pick<
  ClosingAct,
  'executiveSummary' | 'performedActivities' | 'findings' | 'recommendations' | 'conclusions' | 'limitations'
>;
