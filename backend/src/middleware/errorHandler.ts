import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  errors?: any[];
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('ERROR:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  const errors = err.errors || [];
  
  // Detailed error in development
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      stack: err.stack,
    });
  }
  
  // Sanitized error in production
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length ? errors : undefined,
  });
}; 