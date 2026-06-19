import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { config } from './config';
import { errorHandler } from './errors/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import apiRoutes from './routes';

export function createApp(): Application {
  const app = express();

  // ── Security / parsing ─────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.cors.origin,
      methods: ['GET', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Logging ────────────────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use('/api', apiRoutes);

  // ── 404 ────────────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // ── Centralised error handler ──────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
