// Security headers for Edge Functions
// NOTE: corsHeaders with wildcard is DEPRECATED - use getValidatedCorsHeaders from cors-validator.ts instead
// This export is kept for backward compatibility but should not be used in new code
/**
 * @deprecated Use getValidatedCorsHeaders from cors-validator.ts for proper origin validation
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '', // Empty - must use validated CORS
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * Create a secure response with proper headers
 * @param body - Response body (string or object)
 * @param status - HTTP status code
 * @param corsHeaders - CORS headers from getValidatedCorsHeaders (required for cross-origin requests)
 * @param additionalHeaders - Any extra headers
 */
export function createSecureResponse(
  body: string | object,
  status: number = 200,
  corsHeaders: Record<string, string> = {},
  additionalHeaders: Record<string, string> = {}
): Response {
  const headers = {
    'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json',
    ...securityHeaders,
    ...corsHeaders,
    ...additionalHeaders,
  };

  return new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    { status, headers }
  );
}

/**
 * @deprecated Use createCorsPreflightResponse from cors-validator.ts for proper origin validation
 */
export function handleCorsPreFlight(): Response {
  console.warn('handleCorsPreFlight is deprecated - use createCorsPreflightResponse from cors-validator.ts');
  return new Response('ok', { 
    headers: securityHeaders,
    status: 200 
  });
}
