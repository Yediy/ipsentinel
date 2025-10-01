import { sanitizeInput, isValidEmail, isValidUUID } from './security';

// Enhanced validation utilities
export function validateAndSanitizeInput(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  if (input.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength}`);
  }
  
  return sanitizeInput(input);
}

export function validateEmailStrict(email: string): boolean {
  if (!isValidEmail(email)) return false;
  
  // Additional checks
  if (email.length > 254) return false; // RFC 5321
  const [local, domain] = email.split('@');
  if (local.length > 64) return false; // RFC 5321
  if (domain.length > 255) return false;
  
  return true;
}

export function validateUUIDStrict(uuid: string): boolean {
  if (!isValidUUID(uuid)) return false;
  
  // Additional format validation
  const parts = uuid.split('-');
  if (parts.length !== 5) return false;
  if (parts[0].length !== 8) return false;
  if (parts[1].length !== 4) return false;
  if (parts[2].length !== 4) return false;
  if (parts[3].length !== 4) return false;
  if (parts[4].length !== 12) return false;
  
  return true;
}

// Safe JSON parsing with validation
export function parseJSONSafely<T>(input: string): T | null {
  try {
    const parsed = JSON.parse(input);
    return parsed as T;
  } catch {
    return null;
  }
}

// Validate URL and ensure it's safe
export function validateSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS or HTTP for localhost
    if (parsed.protocol !== 'https:' && 
        !(parsed.protocol === 'http:' && 
          (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'))) {
      return false;
    }
    
    // Block private IP ranges in hostname
    const hostname = parsed.hostname.toLowerCase();
    if (hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Content Security helpers
export function stripHTMLTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

export function escapeHTML(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, char => map[char]);
}

// Validate file upload metadata
export interface FileUploadValidation {
  maxSize: number;
  allowedTypes: string[];
}

export function validateFileUpload(
  file: File,
  validation: FileUploadValidation
): { valid: boolean; error?: string } {
  if (file.size > validation.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${validation.maxSize / 1024 / 1024}MB`,
    };
  }
  
  if (!validation.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }
  
  // Additional checks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename',
    };
  }
  
  return { valid: true };
}

// Rate limiting helper (client-side)
export class ClientRateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    
    if (record.count >= this.maxAttempts) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
  
  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record || Date.now() > record.resetAt) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - record.count);
  }
}
