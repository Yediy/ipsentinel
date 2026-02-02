import { createSecureResponse } from './security-headers.ts';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown, corsHeaders: Record<string, string> = {}): Response {
  console.error('Error occurred:', error);

  if (error instanceof AppError) {
    return createSecureResponse(
      {
        error: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
      error.statusCode,
      corsHeaders
    );
  }

  if (error instanceof Error) {
    // Don't expose internal error details in production
    const isProduction = Deno.env.get('DENO_ENV') === 'production';
    return createSecureResponse(
      {
        error: 'INTERNAL_ERROR',
        message: isProduction ? 'An unexpected error occurred' : error.message,
      },
      500,
      corsHeaders
    );
  }

  return createSecureResponse(
    {
      error: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    },
    500,
    corsHeaders
  );
}

export function createValidationError(message: string, details?: unknown): AppError {
  return new AppError(message, 400, 'VALIDATION_ERROR', details);
}

export function createAuthError(message: string = 'Unauthorized'): AppError {
  return new AppError(message, 401, 'AUTH_ERROR');
}

export function createNotFoundError(resource: string = 'Resource'): AppError {
  return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
}

export function createForbiddenError(message: string = 'Forbidden'): AppError {
  return new AppError(message, 403, 'FORBIDDEN');
}
