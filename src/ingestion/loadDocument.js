const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

async function loadPdf(filePath) {
  // Use lib path to avoid pdf-parse's debug test-file side effect on require
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return {
    text: (data.text || '').trim(),
    meta: {
      type: 'pdf',
      pages: data.numpages,
      info: data.info || {},
    },
  };
}

function loadTxt(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return {
    text: text.trim(),
    meta: { type: 'txt' },
  };
}

function loadCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const lines = records.map((row, i) => {
    const cells = Object.entries(row)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    return `Row ${i + 1}: ${cells}`;
  });

  return {
    text: lines.join('\n').trim(),
    meta: { type: 'csv', rows: records.length },
  };
}

function loadExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const parts = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    parts.push(`Sheet: ${sheetName}`);
    rows.forEach((row, i) => {
      const cells = Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
      parts.push(`Row ${i + 1}: ${cells}`);
    });
    parts.push('');
  }

  return {
    text: parts.join('\n').trim(),
    meta: { type: 'excel', sheets: workbook.SheetNames },
  };
}

/**
 * Load an enterprise document and return plain text + metadata.
 * Supported: PDF, TXT, CSV, Excel (.xlsx / .xls)
 */
async function loadDocument(filePath) {
  const normalized = path.normalize(filePath);
  if (!fs.existsSync(normalized)) {
    throw new Error(`File not found: ${normalized}`);
  }

  const ext = path.extname(normalized).toLowerCase();

  let result;
  switch (ext) {
    case '.pdf':
      result = await loadPdf(normalized);
      break;
    case '.txt':
      result = loadTxt(normalized);
      break;
    case '.csv':
      result = loadCsv(normalized);
      break;
    case '.xlsx':
    case '.xls':
      result = loadExcel(normalized);
      break;
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }

  if (!result.text) {
    throw new Error(
      'No extractable text found. Scanned/image-only PDFs are not supported without OCR.'
    );
  }

  return {
    text: result.text,
    meta: {
      ...result.meta,
      sourcePath: normalized,
      fileName: path.basename(normalized),
      charCount: result.text.length,
    },
  };
}

module.exports = { loadDocument };
