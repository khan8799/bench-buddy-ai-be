import { z } from 'zod';

export const ChatRequestSchema = z.object({
  message: z
    .string({ required_error: 'message is required' })
    .trim()
    .min(2, 'message must be at least 2 characters')
    .max(2000, 'message must not exceed 2000 characters'),
});

export type ChatRequestDto = z.infer<typeof ChatRequestSchema>;
