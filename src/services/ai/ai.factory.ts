import { config } from '../../config';
import { IAIService } from '../../types';
import { OpenAIService } from './openai.service';
import { AnthropicService } from './anthropic.service';
import { HuggingFaceService } from './huggingface.service';

/** Returns the correct AI service based on the AI_PROVIDER env variable. */
export function createAIService(): IAIService {
  switch (config.ai.provider) {
    case 'anthropic':
      return new AnthropicService();
    case 'huggingface':
      return new HuggingFaceService();
    case 'openai':
    default:
      return new OpenAIService();
  }
}

// Singleton used throughout the app
export const aiService: IAIService = createAIService();
