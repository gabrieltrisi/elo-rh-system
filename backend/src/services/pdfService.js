const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 44;
const HEADER_HEIGHT = 96;
const FOOTER_Y = 34;

const COLORS = {
  navy: [0.04, 0.09, 0.19],
  blue: [0.08, 0.24, 0.62],
  slate: [0.25, 0.32, 0.44],
  muted: [0.48, 0.55, 0.65],
  line: [0.88, 0.91, 0.95],
  soft: [0.96, 0.98, 1],
  white: [1, 1, 1],
  green: [0.02, 0.47, 0.28],
  red: [0.70, 0.10, 0.10],
  amber: [0.72, 0.38, 0.04],
};

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapePdfText = (value) =>
  normalizeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const formatNumber = (value) =>
  Number(value || 0)
    .toFixed(2)
    .replace('.', ',');

export const formatPdfCurrency = (value) => `R$ ${formatNumber(value)}`;

export const formatPdfDate = (value) => {
  if (!value) return '-';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return normalizeText(value);
  }

  return parsed.toLocaleDateString('pt-BR');
};

const formatPdfDateTime = (value = new Date()) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
};

class OfficialPdfBuilder {
  constructor({ title, subtitle, companyName, documentCode, issuedAt }) {
    this.title = normalizeText(title || 'Documento EloSystem');
    this.subtitle = normalizeText(subtitle || '');
    this.companyName = normalizeText(companyName || 'EloSystem');
    this.documentCode = normalizeText(documentCode || '');
    this.issuedAt = issuedAt || new Date();
    this.pages = [];
    this.pageNumber = 0;
    this.addPage();
  }

  currentPage() {
    return this.pages[this.pages.length - 1];
  }

  addOp(op) {
    this.currentPage().ops.push(op);
  }

  addPage() {
    this.pageNumber += 1;
    this.pages.push({ ops: [], y: PAGE_HEIGHT - MARGIN_X });
    this.drawHeader();
    this.drawFooter();
    this.currentPage().y = PAGE_HEIGHT - HEADER_HEIGHT - 28;
  }

  ensureSpace(height) {
    if (this.currentPage().y - height < 70) {
      this.addPage();
    }
  }

  setY(value) {
    this.currentPage().y = value;
  }

  getY() {
    return this.currentPage().y;
  }

  moveY(delta) {
    this.currentPage().y -= delta;
  }

  rect(x, y, width, height, color = COLORS.soft) {
    this.addOp(
      `q ${color.join(' ')} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(
        2
      )} ${height.toFixed(2)} re f Q`
    );
  }

  strokeRect(x, y, width, height, color = COLORS.line) {
    this.addOp(
      `q ${color.join(' ')} RG 0.8 w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(
        2
      )} ${height.toFixed(2)} re S Q`
    );
  }

  line(x1, y1, x2, y2, color = COLORS.line, width = 0.8) {
    this.addOp(
      `q ${color.join(' ')} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(
        2
      )} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q`
    );
  }

  text(value, x, y, options = {}) {
    const {
      size = 10,
      font = 'F1',
      color = COLORS.slate,
      maxWidth = null,
      lineHeight = size + 4,
    } = options;
    const text = normalizeText(value);
    const lines = maxWidth ? this.wrapText(text, maxWidth, size) : [text];

    lines.forEach((line, index) => {
      this.addOp(
        `BT /${font} ${size} Tf ${color.join(' ')} rg ${x.toFixed(2)} ${(
          y - index * lineHeight
        ).toFixed(2)} Td (${escapePdfText(line)}) Tj ET`
      );
    });

    return lines.length * lineHeight;
  }

  wrapText(value, maxWidth, size) {
    const words = normalizeText(value).split(' ').filter(Boolean);
    const lines = [];
    let line = '';
    const averageCharWidth = size * 0.48;
    const maxChars = Math.max(12, Math.floor(maxWidth / averageCharWidth));

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;

      if (candidate.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });

    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  drawHeader() {
    this.rect(0, PAGE_HEIGHT - HEADER_HEIGHT, PAGE_WIDTH, HEADER_HEIGHT, COLORS.navy);
    this.rect(MARGIN_X, PAGE_HEIGHT - 70, 38, 38, COLORS.blue);
    this.text('ELO', MARGIN_X + 8, PAGE_HEIGHT - 54, {
      size: 12,
      font: 'F2',
      color: COLORS.white,
    });
    this.text(this.companyName, MARGIN_X + 52, PAGE_HEIGHT - 38, {
      size: 12,
      font: 'F2',
      color: COLORS.white,
    });
    this.text('Documento oficial gerado pelo EloSystem', MARGIN_X + 52, PAGE_HEIGHT - 57, {
      size: 8,
      color: [0.78, 0.84, 0.94],
    });
    this.text(this.title, MARGIN_X, PAGE_HEIGHT - 112, {
      size: 21,
      font: 'F2',
      color: COLORS.navy,
    });
    if (this.subtitle) {
      this.text(this.subtitle, MARGIN_X, PAGE_HEIGHT - 132, {
        size: 9,
        color: COLORS.muted,
        maxWidth: PAGE_WIDTH - MARGIN_X * 2,
      });
    }
    this.text(`Emitido em ${formatPdfDateTime(this.issuedAt)}`, PAGE_WIDTH - 205, PAGE_HEIGHT - 38, {
      size: 8,
      color: [0.78, 0.84, 0.94],
    });
    if (this.documentCode) {
      this.text(this.documentCode, PAGE_WIDTH - 205, PAGE_HEIGHT - 56, {
        size: 8,
        color: [0.78, 0.84, 0.94],
      });
    }
  }

  drawFooter() {
    this.line(MARGIN_X, FOOTER_Y + 18, PAGE_WIDTH - MARGIN_X, FOOTER_Y + 18);
    this.text('EloSystem | Documento gerado eletronicamente para uso interno corporativo.', MARGIN_X, FOOTER_Y, {
      size: 8,
      color: COLORS.muted,
    });
    this.text(`Pagina ${this.pageNumber}`, PAGE_WIDTH - 92, FOOTER_Y, {
      size: 8,
      color: COLORS.muted,
    });
  }

  sectionTitle(title) {
    this.ensureSpace(38);
    this.moveY(14);
    const y = this.getY();
    this.rect(MARGIN_X, y - 6, 4, 18, COLORS.blue);
    this.text(title, MARGIN_X + 12, y, {
      size: 13,
      font: 'F2',
      color: COLORS.navy,
    });
    this.moveY(22);
  }

  paragraph(text) {
    this.ensureSpace(45);
    const height = this.text(text, MARGIN_X, this.getY(), {
      size: 10,
      color: COLORS.slate,
      maxWidth: PAGE_WIDTH - MARGIN_X * 2,
      lineHeight: 15,
    });
    this.moveY(height + 8);
  }

  keyValueGrid(items = []) {
    if (!items.length) return;

    this.ensureSpace(90);
    const colWidth = (PAGE_WIDTH - MARGIN_X * 2 - 12) / 2;
    let x = MARGIN_X;
    let y = this.getY();

    items.forEach((item, index) => {
      if (index > 0 && index % 2 === 0) {
        x = MARGIN_X;
        y -= 54;
      }

      this.rect(x, y - 40, colWidth, 46, COLORS.soft);
      this.strokeRect(x, y - 40, colWidth, 46);
      this.text(item.label, x + 12, y - 6, {
        size: 8,
        font: 'F2',
        color: COLORS.muted,
      });
      this.text(item.value || '-', x + 12, y - 23, {
        size: 10,
        font: 'F2',
        color: COLORS.navy,
        maxWidth: colWidth - 24,
      });
      x += colWidth + 12;
    });

    const rows = Math.ceil(items.length / 2);
    this.setY(this.getY() - rows * 54 - 10);
  }

  summaryCards(cards = []) {
    if (!cards.length) return;

    this.ensureSpace(76);
    const gap = 10;
    const cardWidth = (PAGE_WIDTH - MARGIN_X * 2 - gap * (cards.length - 1)) / cards.length;
    let x = MARGIN_X;
    const y = this.getY();

    cards.forEach((card) => {
      this.rect(x, y - 52, cardWidth, 58, card.color || COLORS.soft);
      this.strokeRect(x, y - 52, cardWidth, 58);
      this.text(card.label, x + 10, y - 8, {
        size: 8,
        font: 'F2',
        color: COLORS.muted,
      });
      this.text(card.value, x + 10, y - 31, {
        size: 15,
        font: 'F2',
        color: card.textColor || COLORS.navy,
      });
      x += cardWidth + gap;
    });

    this.moveY(76);
  }

  table({ columns = [], rows = [] }) {
    if (!columns.length) return;

    const tableWidth = PAGE_WIDTH - MARGIN_X * 2;
    const headerHeight = 24;
    const rowHeight = 24;
    const widths = columns.map((column) => column.width || tableWidth / columns.length);

    this.ensureSpace(headerHeight + rowHeight * Math.min(rows.length, 5) + 12);

    let y = this.getY();
    this.rect(MARGIN_X, y - headerHeight + 6, tableWidth, headerHeight, COLORS.navy);
    let x = MARGIN_X;

    columns.forEach((column, index) => {
      this.text(column.label, x + 8, y - 9, {
        size: 8,
        font: 'F2',
        color: COLORS.white,
        maxWidth: widths[index] - 12,
      });
      x += widths[index];
    });

    y -= headerHeight;
    this.setY(y);

    if (!rows.length) {
      this.text('Nenhum item encontrado.', MARGIN_X + 8, y - 12, {
        size: 9,
        color: COLORS.muted,
      });
      this.setY(y - 34);
      return;
    }

    rows.forEach((row, rowIndex) => {
      this.ensureSpace(rowHeight + 12);
      y = this.getY();
      if (rowIndex > 0 || y < 110) {
        y = this.getY();
      }

      const bg = rowIndex % 2 === 0 ? [0.99, 1, 1] : COLORS.soft;
      this.rect(MARGIN_X, y - rowHeight + 6, tableWidth, rowHeight, bg);
      this.line(MARGIN_X, y - rowHeight + 6, PAGE_WIDTH - MARGIN_X, y - rowHeight + 6);
      x = MARGIN_X;

      columns.forEach((column, index) => {
        this.text(row[column.key] ?? '-', x + 8, y - 10, {
          size: 8.5,
          color: column.color || COLORS.slate,
          maxWidth: widths[index] - 12,
        });
        x += widths[index];
      });

      this.setY(y - rowHeight);
    });

    this.moveY(12);
  }

  signatureBlocks(labels = []) {
    if (!labels.length) return;

    this.ensureSpace(98);
    this.moveY(26);
    const width = (PAGE_WIDTH - MARGIN_X * 2 - 24) / labels.length;
    let x = MARGIN_X;
    const y = this.getY();

    labels.forEach((label) => {
      this.line(x, y, x + width, y, COLORS.slate, 0.8);
      this.text(label, x, y - 16, {
        size: 8.5,
        color: COLORS.muted,
        maxWidth: width,
      });
      x += width + 24;
    });

    this.moveY(54);
  }

  build() {
    return buildPdfBuffer(this.pages);
  }
}

const buildPdfBuffer = (pages) => {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegularRef = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );
  const fontBoldRef = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );
  const pagesRef = addObject('');
  const pageRefs = [];

  pages.forEach((page) => {
    const content = page.ops.join('\n');
    const contentRef = addObject(
      `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`
    );
    const pageRef = addObject(
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularRef} 0 R /F2 ${fontBoldRef} 0 R >> >> /Contents ${contentRef} 0 R >>`
    );
    pageRefs.push(pageRef);
  });

  objects[pagesRef - 1] = `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs
    .map((ref) => `${ref} 0 R`)
    .join(' ')}] >>`;
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
};

export const createOfficialPdfBuffer = ({
  title,
  subtitle,
  companyName,
  documentCode,
  issuedAt = new Date(),
  meta = [],
  summaryCards = [],
  sections = [],
  tables = [],
  signatures = [],
} = {}) => {
  const pdf = new OfficialPdfBuilder({
    title,
    subtitle,
    companyName,
    documentCode,
    issuedAt,
  });

  if (meta.length) {
    pdf.sectionTitle('Identificacao');
    pdf.keyValueGrid(meta);
  }

  if (summaryCards.length) {
    pdf.summaryCards(summaryCards);
  }

  sections.forEach((section) => {
    pdf.sectionTitle(section.title);
    if (section.items?.length) {
      pdf.keyValueGrid(section.items);
    }
    if (section.text) {
      pdf.paragraph(section.text);
    }
  });

  tables.forEach((table) => {
    pdf.sectionTitle(table.title);
    pdf.table(table);
  });

  if (signatures.length) {
    pdf.sectionTitle('Ciencia e assinaturas');
    pdf.signatureBlocks(signatures);
  }

  return pdf.build();
};
