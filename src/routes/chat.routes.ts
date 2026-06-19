import { Router } from 'express';
import { ChatRequestSchema } from '../dtos/chat.dto';
import { chatController } from '../controllers/chat.controller';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/', validate(ChatRequestSchema), asyncHandler(chatController.handleChat.bind(chatController)));

router.delete('/cache', asyncHandler(chatController.resetCache.bind(chatController)));

export default router;
