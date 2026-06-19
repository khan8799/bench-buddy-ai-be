import { Request, Response } from 'express';
import { ChatRequestDto } from '../dtos/chat.dto';
import { ragService } from '../services/rag.service';
import { ApiResponse, ChatResponseData } from '../types';

export class ChatController {
  async handleChat(req: Request, res: Response): Promise<void> {
    const { message } = req.body as ChatRequestDto;

    const data = await ragService.answer(message);

    const response: ApiResponse<ChatResponseData> = {
      success: true,
      data,
    };

    res.status(200).json(response);
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, message: 'Bench Buddy AI is running.' });
  }

  async resetCache(_req: Request, res: Response): Promise<void> {
    ragService.resetCache();
    res.status(200).json({ success: true, message: 'Cache cleared.' });
  }
}

export const chatController = new ChatController();
