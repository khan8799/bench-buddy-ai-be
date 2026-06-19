// ── Excel ────────────────────────────────────────────────────────────────────

export interface ExcelRow {
  question: string;
  answer: string;
  category?: string;
}

export interface EmbeddedRow extends ExcelRow {
  embedding: number[];
}

// ── RAG ──────────────────────────────────────────────────────────────────────

export interface ScoredRow {
  row: ExcelRow;
  similarity: number;
}

// ── API ──────────────────────────────────────────────────────────────────────

export interface ChatRequestBody {
  message: string;
}

export interface ChatResponseData {
  originalAnswer: string;
  aiExplanation: string;
  confidence: number;
  matchedQuestion: string;
  additionalInfo: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── AI provider contracts ─────────────────────────────────────────────────────

export interface IAIService {
  generateAnswer(userQuestion: string, context: ScoredRow[]): Promise<ChatResponseData>;
  getEmbedding(text: string): Promise<number[]>;
}
