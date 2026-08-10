import type { jsPDF } from 'jspdf';
import type { Quote, QuoteItem } from '../models/quote.model';
import { COMPANY_PROFILE } from '../../../shared/data/company-profile';

/** `doc.lastAutoTable` es un efecto secundario documentado del plugin (no
 *  aparece en `UserOptions`); se tipa aparte para no usar `any`. */
interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

export interface QuotePdfClient {
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export interface QuotePdfLabels {
  documentTitle: string;
  number: string;
  issueDate: string;
  validUntil: string;
  status: string;
  from: string;
  to: string;
  columnIndex: string;
  columnService: string;
  columnQuantity: string;
  columnUnitPrice: string;
  columnTax: string;
  columnTotal: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  notes: string;
  terms: string;
  generatedOn: string;
}

export interface GenerateQuotePdfParams {
  quote: Quote;
  items: QuoteItem[];
  client?: QuotePdfClient;
  clientName: string;
  locale: string;
  statusLabel: string;
  labels: QuotePdfLabels;
}

/** #11047A — navy institucional usado exclusivamente en el encabezado PDF. */
const PDF_HEADER_RGB: [number, number, number] = [17, 4, 122];
const GRAY_RGB: [number, number, number] = [107, 114, 128];
const DARK_RGB: [number, number, number] = [17, 24, 39];
const PAGE_MARGIN = 40;

function formatCurrency(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value);
}

/** Construye el PDF de una cotización (texto vectorial, no captura de pantalla)
 *  con jsPDF + autoTable. Ambas se importan dinámicamente para que no
 *  engorden el bundle inicial (jsPDF arrastra html2canvas/canvg como
 *  dependencias internas) — solo se cargan cuando el usuario realmente pide
 *  el PDF. No depende de la red para los datos: toda la información ya
 *  viene resuelta por el caller (componente). */
export async function generateQuotePdf(params: GenerateQuotePdfParams): Promise<jsPDF> {
  const { quote, items, client, clientName, locale, statusLabel, labels } = params;
  const [{ jsPDF: JsPdfCtor }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new JsPdfCtor({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const rightEdge = pageWidth - PAGE_MARGIN;

  // Encabezado
  doc.setFillColor(...PDF_HEADER_RGB);
  doc.rect(0, 0, pageWidth, 100, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(COMPANY_PROFILE.businessName, PAGE_MARGIN, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(COMPANY_PROFILE.address, PAGE_MARGIN, 50);
  doc.text(COMPANY_PROFILE.email, PAGE_MARGIN, 62);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(labels.documentTitle, rightEdge, 34, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const headerMetaLines = [
    `${labels.number}: ${quote.quoteNumber}`,
    `${labels.issueDate}: ${formatDate(quote.issueDate, locale)}`,
    ...(quote.validUntil ? [`${labels.validUntil}: ${formatDate(quote.validUntil, locale)}`] : []),
    `${labels.status}: ${statusLabel}`,
  ];
  headerMetaLines.forEach((line, index) => {
    doc.text(line, rightEdge, 50 + index * 12, { align: 'right' });
  });

  // Cotización de / para
  let y = 130;
  const columnWidth = contentWidth / 2 - 10;
  const rightColumnX = PAGE_MARGIN + contentWidth / 2 + 10;

  doc.setTextColor(...GRAY_RGB);
  doc.setFontSize(8);
  doc.text(labels.from.toUpperCase(), PAGE_MARGIN, y);
  doc.text(labels.to.toUpperCase(), rightColumnX, y);
  y += 14;

  doc.setTextColor(...DARK_RGB);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(COMPANY_PROFILE.businessName, PAGE_MARGIN, y);
  doc.text(clientName, rightColumnX, y);
  y += 13;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_RGB);
  const fromLines = [COMPANY_PROFILE.address, COMPANY_PROFILE.email];
  const toLines = [[client?.address, client?.city].filter(Boolean).join(', '), client?.phone, client?.email].filter(
    (line): line is string => !!line,
  );
  const lineCount = Math.max(fromLines.length, toLines.length);
  for (let i = 0; i < lineCount; i += 1) {
    if (fromLines[i]) {
      doc.text(doc.splitTextToSize(fromLines[i], columnWidth), PAGE_MARGIN, y);
    }
    if (toLines[i]) {
      doc.text(doc.splitTextToSize(toLines[i], columnWidth), rightColumnX, y);
    }
    y += 12;
  }

  // Tabla de ítems
  autoTable(doc, {
    startY: y + 14,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [
      [
        labels.columnIndex,
        labels.columnService,
        labels.columnQuantity,
        labels.columnUnitPrice,
        labels.columnTax,
        labels.columnTotal,
      ],
    ],
    body: items.map((item, index) => [
      (index + 1).toString().padStart(2, '0'),
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice, quote.currency, locale),
      `${item.taxRate}%`,
      formatCurrency(item.total, quote.currency, locale),
    ]),
    headStyles: { fillColor: [243, 244, 246], textColor: DARK_RGB, fontStyle: 'bold' },
    bodyStyles: { textColor: DARK_RGB },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { fontSize: 9, cellPadding: 6 },
  });

  // Totales
  let totalsY = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y + 14) + 20;
  const totalsRows: { label: string; value: string; isTotal?: boolean }[] = [
    { label: labels.subtotal, value: formatCurrency(quote.subtotal, quote.currency, locale) },
    { label: labels.tax, value: formatCurrency(quote.tax, quote.currency, locale) },
    ...(quote.discount > 0
      ? [{ label: labels.discount, value: `-${formatCurrency(quote.discount, quote.currency, locale)}` }]
      : []),
    { label: labels.total, value: formatCurrency(quote.total, quote.currency, locale), isTotal: true },
  ];
  for (const { label, value, isTotal } of totalsRows) {
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 11 : 9);
    doc.setTextColor(...(isTotal ? DARK_RGB : GRAY_RGB));
    doc.text(label, rightEdge - 120, totalsY, { align: 'right' });
    doc.text(value, rightEdge, totalsY, { align: 'right' });
    totalsY += isTotal ? 18 : 14;
  }

  // Notas y términos
  let notesY = totalsY + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const [label, content] of [
    [labels.notes, quote.notes],
    [labels.terms, quote.terms],
  ] as const) {
    if (!content) continue;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_RGB);
    doc.text(label, PAGE_MARGIN, notesY);
    notesY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_RGB);
    const wrapped = doc.splitTextToSize(content, contentWidth);
    doc.text(wrapped, PAGE_MARGIN, notesY);
    notesY += wrapped.length * 12 + 8;
  }

  // Pie de página
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_RGB);
  doc.text(`${labels.generatedOn} ${formatDate(new Date(), locale)}`, PAGE_MARGIN, pageHeight - 24);

  return doc;
}

export function quotePdfFileName(quote: Quote): string {
  return `Cotizacion-${quote.quoteNumber}.pdf`;
}
