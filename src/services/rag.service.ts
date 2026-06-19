import { config } from '../config';
import { AppError } from '../errors/AppError';
import { EmbeddedRow, ExcelRow, ScoredRow } from '../types';
import { logger } from '../utils/logger';
import { cosineSimilarity } from '../utils/similarity';
import { aiService } from './ai/ai.factory';
import { excelService } from './excel.service';

// ── Embedding cache ──────────────────────────────────────────────────────────

let embeddedRows: EmbeddedRow[] | null = null;

async function buildEmbeddingCache(rows: ExcelRow[]): Promise<EmbeddedRow[]> {
  if (embeddedRows) return embeddedRows;

  logger.info('Building embedding cache for all Excel rows…');

  const embedded: EmbeddedRow[] = [];
  for (const row of rows) {
    // Combine Q+A so similarity accounts for both
    const text = `${row.question} ${row.answer}`;
    const embedding = await aiService.getEmbedding(text);
    embedded.push({ ...row, embedding });
  }

  embeddedRows = embedded;
  logger.info(`Embedding cache built: ${embedded.length} entries.`);
  return embedded;
}

// ── Retrieval ────────────────────────────────────────────────────────────────

async function retrieveTopK(userQuestion: string, k: number): Promise<ScoredRow[]> {
  const rows = await excelService.loadRows();
  const cache = await buildEmbeddingCache(rows);

  const questionEmbedding = await aiService.getEmbedding(userQuestion);

  const scored: ScoredRow[] = cache.map((row) => ({
    row,
    similarity: cosineSimilarity(questionEmbedding, row.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  const topK = scored.slice(0, k).filter((s) => s.similarity >= config.rag.minSimilarity);

  if (topK.length === 0) {
    logger.warn('No rows met the minimum similarity threshold.', {
      topScore: scored[0]?.similarity,
      threshold: config.rag.minSimilarity,
    });
  }

  return topK;
}

// ── Public API ────────────────────────────────────────────────────────────────

export class RagService {
  async answer(userQuestion: string) {
    logger.debug('RAG pipeline started', { userQuestion });

    const context = await retrieveTopK(userQuestion, config.rag.topK);

    if (context.length === 0) {
      throw new AppError(
        'I could not find relevant information in the knowledge base to answer your question. ' +
          'Please rephrase or contact HR directly.',
        422,
      );
    }

    logger.debug('Top matches', {
      count: context.length,
      scores: context.map((c) => c.similarity.toFixed(3)),
    });

    const result = await aiService.generateAnswer(userQuestion, context);

    logger.info('RAG pipeline complete', { confidence: result.confidence });
    return result;
  }

  /** Call after updating the Excel file to force a fresh load. */
  resetCache() {
    excelService.clearCache();
    embeddedRows = null;
    logger.info('RAG cache cleared.');
  }
}

export const ragService = new RagService();
