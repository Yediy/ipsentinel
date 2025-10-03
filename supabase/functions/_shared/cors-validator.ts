/**
 * CORS validator for edge functions
 * Validates origin against allowed origins from environment variable
 */

const ALLOWED_ORIGINS = (Deno.env.get('CORS_ORIGINS') || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Default fallback for development
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    // Allow requests without origin header (e.g., same-origin, Postman)
    return true;
  }

  // Check against configured origins
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS.includes(origin);
  }

  // Fallback to dev origins if no CORS_ORIGINS configured
  return DEFAULT_DEV_ORIGINS.includes(origin);
}

/**
 * Get validated CORS headers
 * Returns headers with validated origin or denies the request
 */
export function getValidatedCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isOriginAllowed(origin) ? (origin || '*') : 'null';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-webhook-secret',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Create CORS preflight response
 */
export function createCorsPreflightResponse(origin: string | null): Response {
  const headers = getValidatedCorsHeaders(origin);
  return new Response(null, { 
    status: 204,
    headers 
  });
}

/**
 * Validate CORS and return error response if invalid
 */
export function validateCorsOrError(origin: string | null): Response | null {
  if (!isOriginAllowed(origin)) {
    console.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
    return new Response(
      JSON.stringify({ error: 'CORS_ERROR', message: 'Origin not allowed' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  return null;
}
