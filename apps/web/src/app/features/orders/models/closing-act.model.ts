export type ClosingActStatus =
  | 'DRAFT'
  | 'AI_GENERATED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'FINAL';
export type ClosingActSource = 'MANUAL' | 'AI_ASSISTED' | 'UPLOADED';
export type ClientActDecision = 'ACCEPTED' | 'CHANGES_REQUESTED';

export interface ClientActDecisionInput {
  decision: 'ACCEPT' | 'REQUEST_CHANGES';
  representativeName: string;
  representativeRole: string;
  comment: string;
  acceptedTerms: boolean;
}

export interface ClientActDecisionRecord {
  decision: ClientActDecision;
  representativeName: string;
  representativeRole: string;
  comment?: string;
  decidedAt: Date;
  decidedBy: string;
  version: number;
}

/** Modelo de dominio de la colección `closingActs` (CLAUDE.md §9.8). */
export interface ClosingAct {
  id: string;
  orderId: string;
  version: number;
  status: ClosingActStatus;
  source: ClosingActSource;
  title: string;
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
  uploadedFileName?: string;
  uploadedFileSize?: number;
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
  clientDecision?: ClientActDecision;
  clientDecisionComment?: string;
  clientDecisionAt?: Date;
  clientDecisionBy?: string;
  clientDecisionByName?: string;
  clientDecisionByRole?: string;
  clientDecisions?: ClientActDecisionRecord[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/** Campos editables por el coordinador al revisar el borrador (CLAUDE.md §11.6). */
export type ClosingActContent = Pick<
  ClosingAct,
  | 'objective'
  | 'executiveSummary'
  | 'performedActivities'
  | 'findings'
  | 'recommendations'
  | 'conclusions'
  | 'limitations'
  | 'acceptanceNotes'
  | 'serviceProviderRepresentative'
  | 'serviceProviderRepresentativeRole'
  | 'clientRepresentative'
  | 'clientRepresentativeRole'
>;
