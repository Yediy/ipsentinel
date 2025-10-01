// Shared validation utilities for Edge Functions
// Note: Import zod from npm:zod in Deno edge functions

export function validateContentType(req: Request, expected: string = 'application/json'): boolean {
  const contentType = req.headers.get('content-type') || '';
  return contentType.includes(expected);
}

export function validateMethod(req: Request, allowed: string[]): boolean {
  return allowed.includes(req.method);
}

export async function parseAndValidateJson<T>(
  req: Request,
  validator?: (data: unknown) => T
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await req.json();
    
    if (validator) {
      const validated = validator(data);
      return { success: true, data: validated };
    }
    
    return { success: true, data: data as T };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON payload' 
    };
  }
}

export function validateUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/^\/+/, '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

export function validateFileSize(size: number, maxBytes: number = 26214400): boolean {
  return size > 0 && size <= maxBytes;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}
