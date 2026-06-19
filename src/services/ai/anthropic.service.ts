import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import { ChatResponseData, IAIService, ScoredRow } from '../../types';
import { logger } from '../../utils/logger';
import { ExternalServiceError } from '../../errors/AppError';

/**
 * Anthropic Claude implementation.
 * Note: Claude does not natively support embeddings, so this service falls back
 * to a keyword-overlap similarity score when used as the provider.
 * For production semantic search, pair this with a dedicated embedding service
 * (e.g. OpenAI embeddings) or a vector database.
 */
export class AnthropicService implements IAIService {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: config.ai.anthropicApiKey });
    this.model = config.ai.anthropicModel;
  }

  /** Pseudo-embedding via simple TF word-frequency vector (no external call needed). */
  async getEmbedding(text: string): Promise<number[]> {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    const vocab = new Map<string, number>();
    words.forEach((w) => vocab.set(w, (vocab.get(w) ?? 0) + 1));

    // Return a deterministic 128-dim vector seeded from the vocab
    const vector = new Array<number>(128).fill(0);
    vocab.forEach((count, word) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash * 31 + word.charCodeAt(i)) & 0xffffffff;
      }
      const idx = Math.abs(hash) % 128;
      vector[idx] += count;
    });

    // L2-normalise
    const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }

  async generateAnswer(userQuestion: string, context: ScoredRow[]): Promise<ChatResponseData> {
    const best = context[0];
    const originalAnswer = best.row.answer;

    const supportingBlock = context
      .slice(1)
      .map(
        (c, i) =>
          `[${i + 2}] Question: ${c.row.question}\n    Answer: ${c.row.answer}` +
          (c.row.category ? `\n    Category: ${c.row.category}` : ''),
      )
      .join('\n\n');

    const prompt = `You are Bench Buddy AI, an intelligent assistant for bench allocation and HR policies.

The PRIMARY answer below is the exact, authoritative text from the company knowledge base. You must NOT change its meaning or replace it.

Your job is to:
1. Write a clear, conversational "aiExplanation" that rephrases the primary answer for readability — preserve every fact, do not add or remove information.
2. Rate confidence (0–100) based on how well the knowledge base entry addresses the user question.
3. Return the most relevant matched question verbatim.
4. Optionally add brief "additionalInfo" for caveats or related tips (empty string if none).

User question: "${userQuestion}"

PRIMARY answer from knowledge base (exact — do not alter):
"${originalAnswer}"
${best.row.category ? `Category: ${best.row.category}` : ''}
${supportingBlock ? `\nSupporting entries:\n${supportingBlock}` : ''}

Respond ONLY with a valid JSON object (no markdown, no code fences):
{
  "aiExplanation": "<user-friendly rephrasing of the primary answer>",
  "confidence": <integer 0-100>,
  "matchedQuestion": "<most relevant question from the knowledge base, verbatim>",
  "additionalInfo": "<extra context or caveats, or empty string>"
}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw =
        message.content[0]?.type === 'text' ? message.content[0].text : '{}';

      // Strip accidental code fences
      const cleaned = raw.replace(/```(?:json)?/g, '').trim();
      const parsed = JSON.parse(cleaned) as Partial<Omit<ChatResponseData, 'originalAnswer'>>;

      return {
        originalAnswer,
        aiExplanation: parsed.aiExplanation ?? originalAnswer,
        confidence: Math.min(100, Math.max(0, parsed.confidence ?? 50)),
        matchedQuestion: parsed.matchedQuestion ?? best.row.question,
        additionalInfo: parsed.additionalInfo ?? '',
      };
    } catch (err) {
      logger.error('Anthropic chat error', { err });
      throw new ExternalServiceError('Anthropic Claude', (err as Error).message);
    }
  }
}
