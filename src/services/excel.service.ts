import * as XLSX from 'xlsx';
import path from 'path';
import { config } from '../config';
import { ExcelRow } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';

// ── Column name aliases ────────────────────────────────────────────────────────

const QUESTION_ALIASES = ['question', 'q', 'query', 'Question', 'Q'];
const ANSWER_ALIASES = ['answer', 'a', 'response', 'Answer', 'A', 'Response'];
const CATEGORY_ALIASES = ['category', 'cat', 'type', 'Category', 'Type'];

function findColumn(header: string[], aliases: string[]): string | undefined {
  return header.find((h) => aliases.some((a) => h.toLowerCase() === a.toLowerCase()));
}

// ── In-memory cache ───────────────────────────────────────────────────────────

let cachedRows: ExcelRow[] | null = null;

export class ExcelService {
  private readonly filePath: string;

  constructor(filePath = config.data.excelFilePath) {
    this.filePath = path.resolve(filePath);
  }

  /** Load and parse the Excel file. Result is cached for the process lifetime. */
  async loadRows(forceReload = false): Promise<ExcelRow[]> {
    if (cachedRows && !forceReload) return cachedRows;

    logger.info(`Loading Excel data from: ${this.filePath}`);

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.readFile(this.filePath);
    } catch {
      throw new AppError(
        `Could not read Excel file at "${this.filePath}". ` +
          'Ensure the file exists and EXCEL_FILE_PATH is set correctly.',
        500,
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new AppError('Excel file contains no sheets.', 500);

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    if (rawRows.length === 0) throw new AppError('Excel sheet is empty.', 500);

    const header = Object.keys(rawRows[0]);
    const questionCol = findColumn(header, QUESTION_ALIASES);
    const answerCol = findColumn(header, ANSWER_ALIASES);
    const categoryCol = findColumn(header, CATEGORY_ALIASES);

    if (!questionCol || !answerCol) {
      throw new AppError(
        `Excel sheet must have columns for question and answer. ` +
          `Found: ${header.join(', ')}. ` +
          `Expected one of: ${QUESTION_ALIASES.join('/')} and ${ANSWER_ALIASES.join('/')}.`,
        500,
      );
    }

    cachedRows = rawRows
      .map((row) => ({
        question: String(row[questionCol] ?? '').trim(),
        answer: String(row[answerCol] ?? '').trim(),
        category: categoryCol ? String(row[categoryCol] ?? '').trim() : undefined,
      }))
      .filter((r) => r.question && r.answer);

    logger.info(`Loaded ${cachedRows.length} Q&A rows from Excel.`);
    return cachedRows;
  }

  /** Invalidate the in-memory cache (useful for hot-reload scenarios). */
  clearCache(): void {
    cachedRows = null;
  }
}

export const excelService = new ExcelService();
