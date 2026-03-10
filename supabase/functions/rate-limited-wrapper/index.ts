import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://ipsentinel.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function requireAuth(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    throw new Response(JSON.stringify({ error: "AuthRequired" }), { status: 401 });
  }
  return auth.slice(7).trim();
}

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Rate limit configurations by endpoint
const rateLimits: { [key: string]: RateLimitConfig } = {
  'generate-filing': { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests per 15 minutes
  'generate-patent': { windowMs: 15 * 60 * 1000, maxRequests: 5 },  // 5 requests per 15 minutes
  'upload': { windowMs: 5 * 60 * 1000, maxRequests: 20 },           // 20 uploads per 5 minutes
  'default': { windowMs: 15 * 60 * 1000, maxRequests: 100 }         // Default: 100 requests per 15 minutes
};

function getRateLimitKey(request: Request): string {
  // Use IP address or user ID for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // In production, you might want to use authenticated user ID instead
  return `${ip}:${userAgent.substring(0, 50)}`;
}

function getEndpointFromPath(pathname: string): string {
  // Extract endpoint name from path
  const segments = pathname.split('/').filter(Boolean);
  const endpoint = segments[segments.length - 1] || 'default';
  return rateLimits[endpoint] ? endpoint : 'default';
}

function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    const newEntry = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      resetTime: newEntry.resetTime,
      remaining: config.maxRequests - 1
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    resetTime: entry.resetTime,
    remaining: config.maxRequests - entry.count
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    requireAuth(req);
    const url = new URL(req.url);
    const endpoint = getEndpointFromPath(url.pathname);
    const config = rateLimits[endpoint];
    const rateLimitKey = getRateLimitKey(req);

    console.log(`Rate limiting check for endpoint: ${endpoint}, key: ${rateLimitKey}`);

    const { allowed, resetTime, remaining } = checkRateLimit(rateLimitKey, config);

    const responseHeaders = {
      ...corsHeaders,
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    };

    if (!allowed) {
      console.log(`Rate limit exceeded for ${rateLimitKey} on endpoint ${endpoint}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again after ${Math.ceil((resetTime - Date.now()) / 1000)} seconds.`,
          resetTime: resetTime
        }),
        {
          status: 429,
          headers: {
            ...responseHeaders,
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        rateLimit: {
          limit: config.maxRequests,
          remaining: remaining,
          resetTime: resetTime
        }
      }),
      {
        headers: {
          ...responseHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error: any) {
    console.error('Rate limiting error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Rate limiting check failed',
        success: false 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});