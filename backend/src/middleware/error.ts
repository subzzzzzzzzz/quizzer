import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
    return;
  }

  // Handle duplicate key errors (MongoDB unique index)
  if ((err as any).code === 11000) {
    res.status(409).json({
      success: false,
      message: 'Resource already exists or constraint violation',
    });
    return;
  }

  // Fallback to 500
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
