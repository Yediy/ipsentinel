/**
 * Rate limiting utility for Edge Functions
 * Uses in-memory store with sliding window algorithm
 * Note: In serverless environments, this provides best-effort rate limiting
 * For strict limits, use Redis or database-backed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  requests: number[];
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSizeSeconds: number;
  /** Identifier for the rate limit (e.g., 'api', 'auth', 'ai') */
  identifier?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

// In-memory store for rate limits (per isolate)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check and update rate limit for a given key
 * Uses sliding window algorithm for smoother rate limiting
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries();
  
  const now = Date.now();
  const windowMs = config.windowSizeSeconds * 1000;
  const windowStart = now - windowMs;
  
  const fullKey = config.identifier ? `${config.identifier}:${key}` : key;
  let entry = rateLimitStore.get(fullKey);
  
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
      requests: [],
    };
    rateLimitStore.set(fullKey, entry);
  }
  
  // Remove requests outside the sliding window
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
  
  // Check if rate limit exceeded
  if (entry.requests.length >= config.maxRequests) {
    const oldestRequest = Math.min(...entry.requests);
    const retryAfterMs = oldestRequest + windowMs - now;
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(oldestRequest + windowMs),
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }
  
  // Add current request
  entry.requests.push(now);
  entry.count = entry.requests.length;
  
  // Calculate when the window resets
  const resetAt = entry.requests.length > 0 
    ? new Date(Math.min(...entry.requests) + windowMs)
    : new Date(now + windowMs);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.requests.length,
    resetAt,
  };
}

/**
 * Extract rate limit key from request
 * Uses IP address, user ID, or API key as identifier
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  
  const ip = cfConnectingIp || realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
  };
  
  if (!result.allowed && result.retryAfterSeconds) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  
  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: `Too many requests. Please retry after ${result.retryAfterSeconds} seconds.`,
      retryAfter: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...createRateLimitHeaders(result),
        "Content-Type": "application/json",
      },
    }
  );
}

// Preset configurations for common use cases
export const RateLimitPresets = {
  /** Standard API: 100 requests per minute */
  standard: {
    maxRequests: 100,
    windowSizeSeconds: 60,
    identifier: "standard",
  } as RateLimitConfig,
  
  /** AI endpoints: 20 requests per minute (expensive operations) */
  ai: {
    maxRequests: 20,
    windowSizeSeconds: 60,
    identifier: "ai",
  } as RateLimitConfig,
  
  /** Auth endpoints: 10 requests per minute (prevent brute force) */
  auth: {
    maxRequests: 10,
    windowSizeSeconds: 60,
    identifier: "auth",
  } as RateLimitConfig,
  
  /** Webhook endpoints: 1000 requests per minute (high volume expected) */
  webhook: {
    maxRequests: 1000,
    windowSizeSeconds: 60,
    identifier: "webhook",
  } as RateLimitConfig,
  
  /** Payment endpoints: 30 requests per minute */
  payment: {
    maxRequests: 30,
    windowSizeSeconds: 60,
    identifier: "payment",
  } as RateLimitConfig,
  
  /** File upload: 10 requests per minute */
  upload: {
    maxRequests: 10,
    windowSizeSeconds: 60,
    identifier: "upload",
  } as RateLimitConfig,
} as const;

/**
 * Middleware-style rate limiter for edge functions
 * Returns null if allowed, Response if rate limited
 */
export function rateLimitMiddleware(
  req: Request,
  config: RateLimitConfig,
  userId?: string,
  corsHeaders: Record<string, string> = {}
): Response | null {
  const key = getRateLimitKey(req, userId);
  const result = checkRateLimit(key, config);
  
  if (!result.allowed) {
    console.warn(`[RateLimit] Exceeded for ${key}: ${config.identifier || 'default'}`);
    return createRateLimitResponse(result, corsHeaders);
  }
  
  return null;
}
