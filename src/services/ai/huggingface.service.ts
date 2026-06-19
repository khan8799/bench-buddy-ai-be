import { InferenceClient } from '@huggingface/inference';
import { config } from '../../config';
import { ChatResponseData, IAIService, ScoredRow } from '../../types';
import { logger } from '../../utils/logger';
import { ExternalServiceError } from '../../errors/AppError';

export class HuggingFaceService implements IAIService {
  private readonly client: InferenceClient;
  private readonly chatModel: string;
  private readonly embeddingModel: string;

  constructor() {
    this.client = new InferenceClient(config.ai.huggingfaceApiKey, { provider: 'hf-inference' });
    this.chatModel = config.ai.huggingfaceChatModel;
    this.embeddingModel = config.ai.huggingfaceEmbeddingModel;
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.client.featureExtraction({
        model: this.embeddingModel,
        inputs: text.replace(/\n/g, ' '),
      });

      // featureExtraction can return number[] or number[][] depending on pooling.
      // sentence-transformers models return number[][] (tokens × hidden); mean-pool to get one vector.
      if (Array.isArray(result) && Array.isArray(result[0])) {
        const matrix = result as number[][];
        const dim = matrix[0].length;
        const pooled = new Array<number>(dim).fill(0);
        for (const row of matrix) {
          for (let i = 0; i < dim; i++) pooled[i] += row[i];
        }
        const norm = Math.sqrt(pooled.reduce((s, v) => s + v * v, 0)) || 1;
        return pooled.map((v) => v / norm);
      }

      const flat = result as number[];
      const norm = Math.sqrt(flat.reduce((s, v) => s + v * v, 0)) || 1;
      return flat.map((v) => v / norm);
    } catch (err) {
      logger.error('HuggingFace embedding error', { err });
      throw new ExternalServiceError('HuggingFace Embeddings', (err as Error).message);
    }
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

    const systemPrompt = `You are Bench Buddy AI, an intelligent assistant that helps employees understand bench allocation, resource management, and HR policies.

The PRIMARY answer below is the exact, authoritative text from the company knowledge base. You must NOT change its meaning or replace it.

Your job is to:
1. Write a clear, conversational "aiExplanation" that rephrases the primary answer for readability — preserve every fact, do not add or remove information.
2. Rate confidence (0–100) based on how well the knowledge base entry addresses the user question.
3. Return the most relevant matched question verbatim.
4. Optionally add brief "additionalInfo" for caveats or related tips (empty string if none).

IMPORTANT: Respond ONLY with a valid JSON object (no markdown, no code fences):
{
  "aiExplanation": "<user-friendly rephrasing of the primary answer>",
  "confidence": <integer 0-100>,
  "matchedQuestion": "<most relevant question from the knowledge base, verbatim>",
  "additionalInfo": "<extra context or caveats, or empty string>"
}`;

    const userPrompt = `User question: "${userQuestion}"

PRIMARY answer from knowledge base (exact — do not alter):
"${originalAnswer}"
${best.row.category ? `Category: ${best.row.category}` : ''}
${supportingBlock ? `\nSupporting entries:\n${supportingBlock}` : ''}

Now respond with the JSON object.`;

    try {
      const completion = await this.client.chatCompletion({
        model: this.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const cleaned = raw.replace(/```(?:json)?/g, '').trim();

      // Extract JSON object if the model wraps it in extra prose
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? '{}') as Partial<Omit<ChatResponseData, 'originalAnswer'>>;

      return {
        originalAnswer,
        aiExplanation: parsed.aiExplanation ?? originalAnswer,
        confidence: Math.min(100, Math.max(0, parsed.confidence ?? 50)),
        matchedQuestion: parsed.matchedQuestion ?? best.row.question,
        additionalInfo: parsed.additionalInfo ?? '',
      };
    } catch (err) {
      logger.error('HuggingFace chat error', { err });
      throw new ExternalServiceError('HuggingFace Chat', (err as Error).message);
    }
  }
}
