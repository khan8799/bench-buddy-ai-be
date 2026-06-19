import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const aiProvider = optional('AI_PROVIDER', 'openai') as 'openai' | 'anthropic' | 'huggingface';

export const config = {
  server: {
    port: parseInt(optional('PORT', '3001'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
    isDev: optional('NODE_ENV', 'development') === 'development',
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:3000'),
  },

  ai: {
    provider: aiProvider,
    openaiApiKey: aiProvider === 'openai' ? required('OPENAI_API_KEY') : '',
    anthropicApiKey: aiProvider === 'anthropic' ? required('ANTHROPIC_API_KEY') : '',
    huggingfaceApiKey: aiProvider === 'huggingface' ? required('HUGGINGFACE_API_KEY') : '',
    chatModel: optional('CHAT_MODEL', 'gpt-4o-mini'),
    anthropicModel: optional('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
    embeddingModel: optional('EMBEDDING_MODEL', 'text-embedding-3-small'),
    huggingfaceChatModel: optional('HF_CHAT_MODEL', 'Qwen/Qwen2.5-72B-Instruct'),
    huggingfaceEmbeddingModel: optional('HF_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2'),
  },

  rag: {
    topK: parseInt(optional('TOP_K_MATCHES', '3'), 10),
    minSimilarity: parseFloat(optional('MIN_SIMILARITY_THRESHOLD', '0.25')),
  },

  data: {
    excelFilePath: path.resolve(optional('EXCEL_FILE_PATH', './data/bench-buddy.xlsx')),
  },
} as const;
