import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const TEXT_COLOR = rgb(0.16, 0.14, 0.12);
const MUTED = rgb(0.36, 0.31, 0.28);
const ACCENT = rgb(0.72, 0.37, 0.1);
const TABLE_LINE = rgb(0.62, 0.56, 0.5);
const HEADER_BG = rgb(0.95, 0.90, 0.83); // warm parchment tint for header row

// ─── Types ────────────────────────────────────────────────────────────────────
export type InvoicePayload = {
  invoiceNumber: string;
  invoiceDate: string;
  generatedAt: string;
  orderStatus: string;
  distributorName: string | null;
  distributorContact: string | null;
  notes: string | null;
  totalAmount: number;
  shop: {
    id: number;
    regionId: number;
    name: string;
    address: string | null;
    contactPhone: string | null;
    createdAt: string;
  };
  items: Array<{
    name: string;
    description: string | null;
    unitPrice: number;
    quantity: number;
    amount: number;
  }>;
};

function safe(value: unknown, fallback = "-"): string {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function fmtCurrency(value: number): string {
  return `Rs. ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function trimToWidth(text: unknown, maxWidth: number, font: PDFFont, size: number): string {
  const original = safe(text, "");
  if (!original) return "";
  let value = original;
  while (value && font.widthOfTextAtSize(value, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  return value === original ? value : `${value.trimEnd()}...`;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  yFromTop: number,
  size: number,
  color = TEXT_COLOR,
  font?: PDFFont,
) {
  const pageHeight = page.getHeight();
  page.drawText(text, {
    x,
    y: pageHeight - yFromTop - size,
    size,
    color,
    font,
  });
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  yFromTop: number,
  size: number,
  font: PDFFont,
  color = TEXT_COLOR,
) {
  const width = font.widthOfTextAtSize(text, size);
  drawText(page, text, rightX - width, yFromTop, size, color, font);
}

function drawCenterText(
  page: PDFPage,
  text: string,
  leftX: number,
  rightX: number,
  yFromTop: number,
  size: number,
  font: PDFFont,
  color = TEXT_COLOR,
) {
  const width = font.widthOfTextAtSize(text, size);
  const x = leftX + ((rightX - leftX) - width) / 2;
  drawText(page, text, x, yFromTop, size, color, font);
}

function yToPdf(page: PDFPage, yFromTop: number) {
  return page.getHeight() - yFromTop;
}

function drawLine(
  page: PDFPage,
  x1: number,
  y1FromTop: number,
  x2: number,
  y2FromTop: number,
  thickness = 0.7,
  color = TABLE_LINE,
) {
  page.drawLine({
    start: { x: x1, y: yToPdf(page, y1FromTop) },
    end: { x: x2, y: yToPdf(page, y2FromTop) },
    thickness,
    color,
  });
}

function drawRect(
  page: PDFPage,
  x: number,
  yFromTop: number,
  width: number,
  height: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawRectangle({
    x,
    y: yToPdf(page, yFromTop + height),
    width,
    height,
    color,
    opacity: 1,
  });
}

function drawItemsTable(
  page: PDFPage,
  columns: Array<[number, number]>,
  top: number,
  headerHeight: number,
  rowHeight: number,
  rowCount: number,
) {
  const left = columns[0][0];
  const right = columns[columns.length - 1][1];
  const bottom = top + headerHeight + rowHeight * rowCount;

  // Fill header background
  drawRect(page, left, top, right - left, headerHeight, HEADER_BG);

  drawLine(page, left, top, right, top, 0.8);
  drawLine(page, left, top + headerHeight, right, top + headerHeight, 0.8);
  for (let i = 1; i <= rowCount; i += 1) {
    drawLine(page, left, top + headerHeight + rowHeight * i, right, top + headerHeight + rowHeight * i, 0.55);
  }

  drawLine(page, left, top, left, bottom, 0.8);
  drawLine(page, right, top, right, bottom, 0.8);
  columns.slice(0, -1).forEach(([, end]) => {
    drawLine(page, end, top, end, bottom, 0.7);
  });
}

function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  yFromTop: number,
  labelFont: PDFFont,
  valueFont: PDFFont,
  maxWidth: number,
) {
  const labelText = `${label}: `;
  drawText(page, labelText, x, yFromTop, 10.2, MUTED, labelFont);
  const labelWidth = labelFont.widthOfTextAtSize(labelText, 10.2);
  drawText(page, trimToWidth(value, maxWidth - labelWidth, valueFont, 11), x + labelWidth, yFromTop, 11, TEXT_COLOR, valueFont);
}

export async function generateInvoicePdf(templatePath: string, payload: InvoicePayload): Promise<Buffer> {
  const templateBytes = await readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const invoiceNumber = safe(payload.invoiceNumber);
  const invoiceDate = safe(payload.invoiceDate);
  const dueDate = safe(payload.generatedAt);
  const distributorName = safe(payload.distributorName);
  const distributorContact = safe(payload.distributorContact);

  // ── Three-column header layout ────────────────────────────────────────────
  // Col 1: Invoice details  x=34..230
  // Col 2: Shop info        x=240..400
  // Col 3: Distributor info x=410..579
  const colW = 155;
  const headerTopY = 158;

  // No vertical dividers between columns

  // ── Col 1: Invoice ────────────────────────────────────────────────────────
  const c1x = 34;
  const c1Label = "INVOICE";
  const c1LabelW = bold.widthOfTextAtSize(c1Label, 7.5);
  drawText(page, c1Label, c1x, headerTopY, 7.5, MUTED, bold);
  drawLine(page, c1x, headerTopY + 9, c1x + c1LabelW, headerTopY + 9, 0.5, MUTED);
  drawLabelValue(page, "Number", invoiceNumber, c1x, headerTopY + 14, font, bold, 195);
  drawLabelValue(page, "Date", invoiceDate, c1x, headerTopY + 30, font, font, 195);
  drawLabelValue(page, "Generated", dueDate, c1x, headerTopY + 46, font, font, 195);

  // ── Col 2: Shop ───────────────────────────────────────────────────────────
  const c2x = 245;
  const c2Label = "SHIP TO";
  const c2LabelW = bold.widthOfTextAtSize(c2Label, 7.5);
  drawText(page, c2Label, c2x, headerTopY, 7.5, MUTED, bold);
  drawLine(page, c2x, headerTopY + 9, c2x + c2LabelW, headerTopY + 9, 0.5, MUTED);
  drawLabelValue(page, "Shop", safe(payload.shop.name), c2x, headerTopY + 14, font, bold, colW);
  drawLabelValue(page, "Address", safe(payload.shop.address), c2x, headerTopY + 30, font, font, colW);
  drawLabelValue(page, "Phone", safe(payload.shop.contactPhone), c2x, headerTopY + 46, font, font, colW);

  // ── Col 3: Distributor ────────────────────────────────────────────────────
  const c3x = 418;
  const c3Label = "DISTRIBUTOR";
  const c3LabelW = bold.widthOfTextAtSize(c3Label, 7.5);
  drawText(page, c3Label, c3x, headerTopY, 7.5, MUTED, bold);
  drawLine(page, c3x, headerTopY + 9, c3x + c3LabelW, headerTopY + 9, 0.5, MUTED);
  drawLabelValue(page, "Name", distributorName, c3x, headerTopY + 14, font, bold, colW);
  drawLabelValue(page, "Contact", distributorContact, c3x, headerTopY + 30, font, font, colW);

  const colNo: [number, number] = [34, 91];
  const colDesc: [number, number] = [91, 292];
  const colQty: [number, number] = [292, 385];
  const colUnit: [number, number] = [385, 481];
  const colAmount: [number, number] = [481, 579];
  const tableTop = 255;
  const headerHeight = 22;
  const rowStartY = tableTop + headerHeight + 6; // 6px inner top padding for rows
  const rowHeight = 27;
  const rowCount = Math.min(Math.max(payload.items.length, 10), 10);

  drawItemsTable(page, [colNo, colDesc, colQty, colUnit, colAmount], tableTop, headerHeight, rowHeight, rowCount);

  // ── Table header labels ────────────────────────────────────────────────────
  const headerY = tableTop + 5; // vertical baseline inside the header row
  drawCenterText(page, "No.", colNo[0], colNo[1], headerY, 9.5, bold, ACCENT);
  drawText(page, "Description", colDesc[0] + 6, headerY, 9.5, ACCENT, bold);
  drawCenterText(page, "Qty", colQty[0], colQty[1], headerY, 9.5, bold, ACCENT);
  drawRightText(page, "Unit Price", colUnit[1] - 8, headerY, 9.5, bold, ACCENT);
  drawRightText(page, "Amount", colAmount[1] - 8, headerY, 9.5, bold, ACCENT);

  // ── Item rows ──────────────────────────────────────────────────────────────
  const displayedItems = payload.items.slice(0, 10);
  let subtotal = 0;
  displayedItems.forEach((item, index) => {
    const y = rowStartY + index * rowHeight;
    const description = trimToWidth(item.description || item.name, 188, font, 9.5);
    const quantity = safe(item.quantity);
    const unitPrice = fmtCurrency(item.unitPrice);
    const amount = item.amount;
    subtotal += amount;

    drawCenterText(page, String(index + 1), colNo[0], colNo[1], y, 10, font);
    drawText(page, description, colDesc[0] + 6, y, 9.5, TEXT_COLOR, font);
    drawCenterText(page, quantity, colQty[0], colQty[1], y, 10, font);
    drawRightText(page, unitPrice, colUnit[1] - 8, y, 10, font);
    drawRightText(page, fmtCurrency(amount), colAmount[1] - 8, y, 10, bold);
  });

  // ── Summary section — sits flush against the table bottom ─────────────────
  const tableBottom = tableTop + headerHeight + rowHeight * rowCount;
  const discount = 0;
  const taxRate = 0;
  const taxAmount = 0;
  const totalAmount = payload.totalAmount || subtotal;

  const rowGap = 22;                          // gap between summary rows
  const summaryLabelX = 385;                  // aligns with Unit Price column left edge
  const summaryValueX = colAmount[1] - 8;     // right-aligned to Amount column
  const s1 = tableBottom + 10;                // Subtotal row top
  const s2 = s1 + rowGap;                     // Discount row
  const s3 = s2 + rowGap;                     // Tax row
  const s4 = s3 + rowGap + 6;                 // Total row (extra gap before total)

  drawText(page, "Subtotal:", summaryLabelX, s1, 10.5, MUTED, font);
  drawRightText(page, fmtCurrency(subtotal), summaryValueX, s1, 10.5, bold);

  drawText(page, "Discount:", summaryLabelX, s2, 10.5, MUTED, font);
  drawRightText(page, fmtCurrency(discount), summaryValueX, s2, 10.5, font);

  drawText(page, `Tax (${taxRate}%):`, summaryLabelX, s3, 10.5, MUTED, font);
  drawRightText(page, fmtCurrency(taxAmount), summaryValueX, s3, 10.5, font);

  // Separator line above Total
  drawLine(page, summaryLabelX, s4 - 4, colAmount[1], s4 - 4, 0.8, ACCENT);

  drawText(page, "Total:", summaryLabelX, s4, 12.5, ACCENT, bold);
  drawRightText(page, fmtCurrency(totalAmount), summaryValueX, s4, 12.5, bold, ACCENT);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}