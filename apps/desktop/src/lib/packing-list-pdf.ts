import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ExportTruckRecord } from '@lures-dcs/api-contracts';

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function blank(value: string | null | undefined, empty = 'NA'): string {
  const text = value?.trim();
  return text ? text : empty;
}

/** Paper-style date like 4-Sep-26. */
function packingListDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${months[month - 1]}-${String(year).slice(-2)}`;
}

function weightFigure(value: number): string {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

/** Helvetica/WinAnsi — strip unsupported glyphs. */
function pdfSafe(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, '?');
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  options?: { color?: ReturnType<typeof rgb>; maxWidth?: number },
) {
  page.drawText(pdfSafe(text), {
    x,
    y,
    size,
    font,
    color: options?.color ?? rgb(0.1, 0.1, 0.1),
    maxWidth: options?.maxWidth,
  });
}

function drawField(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  font: PDFFont,
  bold: PDFFont,
  width: number,
) {
  drawText(page, label, x, y, bold, 8, { color: rgb(0.35, 0.35, 0.35) });
  drawText(page, value.toUpperCase(), x, y - 12, font, 10, { maxWidth: width });
}

function drawTruckPage(
  page: PDFPage,
  record: ExportTruckRecord,
  fonts: { regular: PDFFont; bold: PDFFont },
) {
  const { regular, bold } = fonts;
  let y = PAGE_HEIGHT - MARGIN;

  drawText(page, 'LUILU RESSOURCES SAS', MARGIN, y, bold, 14);
  y -= 14;
  drawText(page, '167 AV. BUKAMA Q.MUTOSHI', MARGIN, y, regular, 8, {
    color: rgb(0.35, 0.35, 0.35),
  });
  drawText(page, 'Tel: +243843613879', PAGE_WIDTH - MARGIN - 180, y, regular, 8, {
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 11;
  drawText(page, 'C/MANIKA, KOLWEZI', MARGIN, y, regular, 8, { color: rgb(0.35, 0.35, 0.35) });
  drawText(page, 'E-mail: xicboyang@hkexcelllen.com', PAGE_WIDTH - MARGIN - 180, y, regular, 8, {
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 11;
  drawText(page, 'Province du Lualaba, Democratic Republic of Congo', MARGIN, y, regular, 8, {
    color: rgb(0.35, 0.35, 0.35),
  });

  y -= 28;
  const title = 'LISTE DE COLISAGE';
  const titleWidth = bold.widthOfTextAtSize(title, 14);
  drawText(page, title, (PAGE_WIDTH - titleWidth) / 2, y, bold, 14);
  page.drawLine({
    start: { x: (PAGE_WIDTH - titleWidth) / 2, y: y - 2 },
    end: { x: (PAGE_WIDTH + titleWidth) / 2, y: y - 2 },
    thickness: 1,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 28;
  const half = (CONTENT_WIDTH - 16) / 2;
  drawField(page, 'DESCRIPTION', blank(record.cargo_description), MARGIN, y, regular, bold, half);
  drawField(
    page,
    'N DE LISTE DE COLISAGE',
    blank(record.packing_list_number),
    MARGIN + half + 16,
    y,
    regular,
    bold,
    half,
  );
  y -= 32;
  drawField(page, 'DATE', packingListDate(record.loading_date), MARGIN, y, regular, bold, half);
  drawField(
    page,
    'STATUS',
    record.status.replaceAll('_', ' ').toUpperCase(),
    MARGIN + half + 16,
    y,
    regular,
    bold,
    half,
  );

  y -= 30;
  drawText(page, 'DETAILS DU CAMION', MARGIN, y, bold, 10);
  y -= 22;
  drawField(
    page,
    'CHEVAL',
    blank(record.vehicle_registration),
    MARGIN,
    y,
    regular,
    bold,
    CONTENT_WIDTH,
  );
  y -= 28;
  drawField(
    page,
    'CHARIOT-REMORQUE 1',
    blank(record.trailer_registration),
    MARGIN,
    y,
    regular,
    bold,
    half,
  );
  drawField(
    page,
    'CHARIOT-REMORQUE 2',
    blank(record.trailer_registration_2),
    MARGIN + half + 16,
    y,
    regular,
    bold,
    half,
  );
  y -= 28;
  drawField(page, 'CONDUCTEUR', blank(record.driver_name), MARGIN, y, regular, bold, half);
  drawField(
    page,
    'PASSPORT',
    blank(record.driver_passport_reference),
    MARGIN + half + 16,
    y,
    regular,
    bold,
    half,
  );
  y -= 28;
  drawField(
    page,
    'LIEU DE CHARGEMENT',
    blank(record.loading_location),
    MARGIN,
    y,
    regular,
    bold,
    CONTENT_WIDTH,
  );
  y -= 28;
  drawField(
    page,
    'TRANSPORTEUR',
    blank(record.transporter_name),
    MARGIN,
    y,
    regular,
    bold,
    CONTENT_WIDTH,
  );
  y -= 28;
  drawField(page, 'TRANSIT', blank(record.transit_info, '/'), MARGIN, y, regular, bold, half);
  drawField(page, 'BORDER', blank(record.border), MARGIN + half + 16, y, regular, bold, half);
  y -= 28;
  drawField(page, 'AGENT', blank(record.agent), MARGIN, y, regular, bold, CONTENT_WIDTH);

  y -= 26;
  const colNo = MARGIN;
  const colBag = MARGIN + 40;
  const colWeight = MARGIN + 260;
  const colSeal = MARGIN + 380;
  const rowH = 16;

  page.drawRectangle({
    x: MARGIN,
    y: y - 4,
    width: CONTENT_WIDTH,
    height: rowH + 4,
    color: rgb(0.94, 0.94, 0.94),
  });
  drawText(page, 'NO.', colNo + 4, y, bold, 8);
  drawText(page, 'BAG NO.', colBag, y, bold, 8);
  drawText(page, 'NET WEIGHT(KG)', colWeight, y, bold, 8);
  drawText(page, 'SEAL NO.', colSeal, y, bold, 8);
  y -= rowH + 2;

  const bags = record.bags;
  if (bags.length === 0) {
    drawText(page, 'No bags on this packing list.', MARGIN + 4, y, regular, 9, {
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= rowH;
  } else {
    for (let index = 0; index < bags.length; index += 1) {
      if (y < MARGIN + 120) {
        drawText(
          page,
          `... and ${bags.length - index} more bag(s) — open truck detail for full list.`,
          MARGIN + 4,
          y,
          regular,
          8,
          { color: rgb(0.45, 0.2, 0.2) },
        );
        y -= rowH;
        break;
      }
      const bag = bags[index]!;
      page.drawLine({
        start: { x: MARGIN, y: y + 12 },
        end: { x: PAGE_WIDTH - MARGIN, y: y + 12 },
        thickness: 0.4,
        color: rgb(0.75, 0.75, 0.75),
      });
      drawText(page, String(index + 1), colNo + 4, y, regular, 9);
      drawText(page, bag.bag_number, colBag, y, regular, 9);
      drawText(page, weightFigure(bag.net_weight_kg), colWeight, y, regular, 9);
      drawText(page, blank(bag.seal_number), colSeal, y, regular, 9);
      y -= rowH;
    }
  }

  page.drawRectangle({
    x: MARGIN,
    y: y - 4,
    width: CONTENT_WIDTH,
    height: rowH + 4,
    color: rgb(0.94, 0.94, 0.94),
  });
  drawText(page, 'TOTAL:', colNo + 4, y, bold, 9);
  drawText(page, weightFigure(record.total_net_weight_kg), colWeight, y, bold, 9);

  y -= 36;
  drawText(page, 'BENEFICIARY', MARGIN, y, bold, 8, { color: rgb(0.35, 0.35, 0.35) });
  y -= 12;
  drawText(page, 'LUILU RESSOURCES', MARGIN, y, bold, 11);
  y -= 18;
  drawText(
    page,
    'Conseil chaleureux : veuillez verifier le numero/poids/lots/pieces du camion avant de signer',
    MARGIN,
    y,
    regular,
    8,
    { color: rgb(0.4, 0.4, 0.4), maxWidth: CONTENT_WIDTH },
  );

  y -= 36;
  const sigWidth = (CONTENT_WIDTH - 24) / 2;
  const signatures: Array<[string, number, number]> = [
    ['DRIVER', MARGIN, y],
    ['SUPPLY', MARGIN + sigWidth + 24, y],
    ['TRANSPORT AGENT', MARGIN, y - 42],
    ['SECURITY', MARGIN + sigWidth + 24, y - 42],
  ];

  for (const [label, x, sigY] of signatures) {
    drawText(page, `${label}:`, x, sigY, bold, 8);
    page.drawLine({
      start: { x, y: sigY - 18 },
      end: { x: x + sigWidth, y: sigY - 18 },
      thickness: 0.8,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
}

/**
 * Build an A4 PDF packing list for one or more trucks (one page per truck).
 * Latin Helvetica only — Mandarin letterhead line omitted until a CJK font is embedded.
 */
export async function buildPackingListPdf(
  records: readonly ExportTruckRecord[],
): Promise<Uint8Array> {
  if (records.length === 0) {
    throw new Error('No trucks to export.');
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const record of records) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawTruckPage(page, record, { regular, bold });
  }

  return pdf.save();
}
