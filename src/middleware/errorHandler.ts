import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof Error) {
    // eslint-disable-next-line no-console
    console.error('[unhandled error]', err);
    res.status(500).json({ success: false, message: 'Serverda kutilmagan xatolik yuz berdi' });
    return;
  }

  res.status(500).json({ success: false, message: 'Noma\'lum xatolik' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Yo'l topilmadi: ${req.method} ${req.originalUrl}` });
}
