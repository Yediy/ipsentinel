// Security utilities and validation functions

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validates email format securely
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates URL format and security
 */
export function isValidURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    // Only allow HTTPS URLs for external resources
    return urlObj.protocol === 'https:' || (urlObj.protocol === 'http:' && urlObj.hostname === 'localhost');
  } catch {
    return false;
  }
}

/**
 * Sanitizes filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'file';
  
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .substring(0, 255);
}

/**
 * Rate limiting helper for client-side throttling
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(private maxAttempts: number = 5, private windowMs: number = 60000) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Secure error handler that prevents information disclosure
 */
export function sanitizeError(error: unknown, context: string = ''): string {
  // Log full error for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error(`Security Error [${context}]:`, error);
  }
  
  // Return generic error message for production
  if (error instanceof Error) {
    // Don't expose internal system details
    if (error.message.includes('database') || 
        error.message.includes('internal') || 
        error.message.includes('server')) {
      return 'A system error occurred. Please try again later.';
    }
    
    // Allow user-friendly errors
    if (error.message.includes('Invalid email') || 
        error.message.includes('Password') ||
        error.message.includes('authentication')) {
      return error.message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Content validation for user-generated content
 */
export function validateContentLength(content: string, maxLength: number = 10000): boolean {
  return typeof content === 'string' && content.length <= maxLength;
}

/**
 * Prevents timing attacks on sensitive comparisons
 */
export function safeStringCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  
  let result = 0;
  const length = Math.max(a.length, b.length);
  
  for (let i = 0; i < length; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  
  return result === 0 && a.length === b.length;
}