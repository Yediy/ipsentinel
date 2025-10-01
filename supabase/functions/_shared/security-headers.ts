// Security headers for Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Configure per environment
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  ...corsHeaders,
};

export function createSecureResponse(
  body: string | object,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  const headers = {
    'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json',
    ...securityHeaders,
    ...additionalHeaders,
  };

  return new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    { status, headers }
  );
}

export function handleCorsPreFlight(): Response {
  return new Response('ok', { 
    headers: securityHeaders,
    status: 200 
  });
}
