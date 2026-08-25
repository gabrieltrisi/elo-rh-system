import XLSX from 'xlsx';

const HEADER_ALIASES = {
  employeeName: [
    'nome',
    'nomedocolaborador',
    'nomecolaborador',
    'nomefuncionario',
    'funcionario',
    'colaborador',
    'empregado',
  ],
  employeeCode: [
    'matricula',
    'matrícula',
    'codigo',
    'codigofuncionario',
    'codcolaborador',
    'chapa',
    'registro',
  ],
  employeeDocument: ['cpf', 'documento', 'numerodocumento'],
  workDate: ['data', 'datadotrabalho', 'datareferencia', 'dia', 'competencia'],
  firstEntry: ['entrada', 'entrada1', 'primeiraentrada', '1entrada'],
  firstExit: ['saida', 'saída', 'saida1', 'saída1', 'primeirasaida', '1saida'],
  secondEntry: ['entrada2', 'segundaentrada', '2entrada'],
  secondExit: ['saida2', 'saída2', 'segundasaida', '2saida'],
  thirdEntry: ['entrada3', 'terceiraentrada', '3entrada'],
  thirdExit: ['saida3', 'saída3', 'terceirasaida', '3saida'],
  workedMinutes: [
    'horastrabalhadas',
    'horastrabalhadasnomes',
    'trabalhado',
    'tempotrabalhado',
    'horasnormais',
    'jornadacumprida',
  ],
  overtimeMinutes: [
    'horasextras',
    'horaextra',
    'extras',
    'he50',
    'he100',
    'totalextras',
  ],
  delayMinutes: ['atrasos', 'atraso', 'minutosdeatraso'],
  absenceMinutes: ['faltas', 'ausencias', 'ausencia', 'minutosdefalta'],
  bankHoursMinutes: ['bancodehoras', 'saldobancodehoras', 'saldo', 'saldohoras'],
  notes: ['observacoes', 'observacao', 'obs', 'justificativa', 'anotacoes'],
};

const REQUIRED_FIELDS = ['workDate'];

const normalizeHeader = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim();

const parseDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    );
  }

  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 86400000);
    return Number.isNaN(parsed.getTime())
      ? null
      : new Date(
          Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
        );
  }

  const stringValue = String(value).trim();
  if (!stringValue) return null;

  const slashMatch = stringValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(Date.UTC(Number(fullYear), Number(month) - 1, Number(day)));
  }

  const dashMatch = stringValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    const [, year, month, day] = dashMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  );
};

const parseTimeString = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeMatch) {
    return null;
  }

  const [, hours, minutes, seconds = '00'] = timeMatch;
  return `${hours.padStart(2, '0')}:${minutes}:${seconds}`;
};

export const parseDurationToMinutes = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    if (Math.abs(value) <= 24) {
      return Math.round(value * 60);
    }

    return Math.round(value);
  }

  const raw = String(value).trim();
  if (!raw) return 0;

  const timeMatch = raw.match(/^(-)?(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const [, signal, hours, minutes] = timeMatch;
    const totalMinutes = Number(hours) * 60 + Number(minutes);
    return signal ? -totalMinutes : totalMinutes;
  }

  const decimalMatch = raw.replace(',', '.').match(/^(-?\d+(?:\.\d+)?)$/);
  if (decimalMatch) {
    const numeric = Number(decimalMatch[1]);
    if (Math.abs(numeric) <= 24) {
      return Math.round(numeric * 60);
    }

    return Math.round(numeric);
  }

  return 0;
};

export const detectFieldMap = (headers = []) => {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  const fieldMap = {};

  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    const matchedHeader = normalizedHeaders.find((header) =>
      aliases.includes(header.normalized)
    );

    if (matchedHeader) {
      fieldMap[field] = matchedHeader.original;
    }
  });

  return fieldMap;
};

export const parseTimeImportFile = (fileBuffer, originalName) => {
  const workbook = XLSX.read(fileBuffer, {
    type: 'buffer',
    cellDates: true,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return {
      headers: [],
      fieldMap: {},
      rows: [],
      missingRequiredFields: REQUIRED_FIELDS,
    };
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const fieldMap = detectFieldMap(headers);
  const missingRequiredFields = REQUIRED_FIELDS.filter((field) => !fieldMap[field]);

  const normalizedRows = rows.map((row, index) => {
    const punches = [
      parseTimeString(row[fieldMap.firstEntry]),
      parseTimeString(row[fieldMap.firstExit]),
      parseTimeString(row[fieldMap.secondEntry]),
      parseTimeString(row[fieldMap.secondExit]),
      parseTimeString(row[fieldMap.thirdEntry]),
      parseTimeString(row[fieldMap.thirdExit]),
    ].filter(Boolean);

    return {
      sourceRowNumber: index + 2,
      employeeNameSnapshot: String(row[fieldMap.employeeName] || '').trim() || null,
      employeeCodeSnapshot: String(row[fieldMap.employeeCode] || '').trim() || null,
      employeeDocumentSnapshot:
        String(row[fieldMap.employeeDocument] || '').trim() || null,
      workDate: parseDateValue(row[fieldMap.workDate]),
      firstEntry: parseTimeString(row[fieldMap.firstEntry]),
      firstExit: parseTimeString(row[fieldMap.firstExit]),
      secondEntry: parseTimeString(row[fieldMap.secondEntry]),
      secondExit: parseTimeString(row[fieldMap.secondExit]),
      thirdEntry: parseTimeString(row[fieldMap.thirdEntry]),
      thirdExit: parseTimeString(row[fieldMap.thirdExit]),
      punchesJson: punches,
      workedMinutes: parseDurationToMinutes(row[fieldMap.workedMinutes]),
      overtimeMinutes: parseDurationToMinutes(row[fieldMap.overtimeMinutes]),
      delayMinutes: parseDurationToMinutes(row[fieldMap.delayMinutes]),
      absenceMinutes: parseDurationToMinutes(row[fieldMap.absenceMinutes]),
      bankHoursMinutes: parseDurationToMinutes(row[fieldMap.bankHoursMinutes]),
      notes: String(row[fieldMap.notes] || '').trim() || null,
      rawJson: row,
      originalName,
    };
  });

  return {
    headers,
    fieldMap,
    rows: normalizedRows,
    missingRequiredFields,
  };
};
