import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from './AppError';
import { logger } from '../utils/logger';
import { config } from '../config';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Known operational errors
  if (err instanceof AppError) {
    if (!err.isOperational) logger.error('Non-operational error', { err });

    const body: Record<string, unknown> = {
      success: false,
      error: err.message,
    };
    if (err instanceof ValidationError) body['details'] = err.details;

    res.status(err.statusCode).json(body);
    return;
  }

  // Unknown errors
  logger.error('Unhandled error', { err });
  res.status(500).json({
    success: false,
    error: config.server.isDev
      ? (err instanceof Error ? err.message : String(err))
      : 'Internal server error',
  });
};
