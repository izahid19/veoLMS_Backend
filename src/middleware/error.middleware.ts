import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';
import { config } from '../config/config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  // Known operational errors — respond with structured message
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
    return;
  }

  // Unknown / unexpected errors
  console.error('UNHANDLED ERROR:', err);

  if (config.NODE_ENV !== 'production') {
    console.error(
      JSON.stringify({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
      }),
    );
  }

  res.status(500).json({
    success: false,
    error: 'SERVER_ERROR',
    message: 'Internal Server Error',
  });
};
