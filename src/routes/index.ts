import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { chatController } from '../controllers/chat.controller';
import chatRoutes from './chat.routes';

const router = Router();

router.get('/health', asyncHandler(chatController.healthCheck.bind(chatController)));

router.use('/chat', chatRoutes);

export default router;
