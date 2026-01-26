import multer from "multer";
import type { Request, Response, NextFunction } from "express";

export const anyUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || String(25 * 1024 * 1024), 10)
  }
});

// MIME types allowed for upload
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf"
]);

// Note: SVG removed from allowed types due to XSS risk
// If SVG support is needed, implement sanitization with svgo

// Magic number signatures for file type validation
const FILE_SIGNATURES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4E, 0x47], // PNG: 89 50 4E 47
  "image/jpeg": [0xFF, 0xD8, 0xFF],       // JPEG: FF D8 FF
  "application/pdf": [0x25, 0x50, 0x44, 0x46] // PDF: %PDF (25 50 44 46)
};

// Maximum allowed dimensions for images (prevent resource exhaustion)
const MAX_IMAGE_DIMENSION = 4096;

/**
 * Validates file magic numbers to prevent MIME type spoofing
 */
function validateMagicNumber(buffer: Buffer, mimeType: string): boolean {
  const signature = FILE_SIGNATURES[mimeType];
  if (!signature) {
    return false;
  }
  
  if (buffer.length < signature.length) {
    return false;
  }
  
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates image dimensions from buffer (basic check for PNG and JPEG)
 */
function validateImageDimensions(buffer: Buffer, mimeType: string): { valid: boolean; error?: string } {
  try {
    if (mimeType === "image/png") {
      // PNG dimensions are at bytes 16-23 (width at 16-19, height at 20-23)
      if (buffer.length < 24) {
        return { valid: false, error: "Invalid PNG file" };
      }
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        return { valid: false, error: `Image dimensions exceed maximum of ${MAX_IMAGE_DIMENSION}px` };
      }
    } else if (mimeType === "image/jpeg") {
      // JPEG dimensions require parsing SOF markers - do basic size check
      // For full validation, use a library like sharp in production
      if (buffer.length < 2) {
        return { valid: false, error: "Invalid JPEG file" };
      }
      // Basic validation - actual dimension check would require parsing JPEG structure
      // In production, use sharp: const metadata = await sharp(buffer).metadata();
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Failed to validate image dimensions" };
  }
}

/**
 * Enhanced file validation middleware
 * - Validates MIME type from request
 * - Validates file magic numbers (prevents MIME spoofing)
 * - Validates image dimensions (prevents resource exhaustion)
 * - Rejects SVG files (XSS risk)
 */
export function ensureAllowed(req: Request, res: Response, next: NextFunction) {
  const f = (req as any).file as Express.Multer.File | undefined;
  
  if (!f) {
    return res.status(400).json({ error: "NoFile" });
  }
  
  const mimeType = f.mimetype || "";
  
  // Check if MIME type is in allowed list
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return res.status(415).json({ 
      error: "UnsupportedMediaType",
      message: "Only PNG, JPEG, and PDF files are allowed"
    });
  }
  
  // Validate file magic numbers to prevent MIME spoofing
  if (!validateMagicNumber(f.buffer, mimeType)) {
    return res.status(415).json({ 
      error: "InvalidFileContent",
      message: "File content does not match declared type"
    });
  }
  
  // Validate image dimensions if it's an image
  if (mimeType.startsWith("image/")) {
    const dimensionResult = validateImageDimensions(f.buffer, mimeType);
    if (!dimensionResult.valid) {
      return res.status(400).json({ 
        error: "InvalidImageDimensions",
        message: dimensionResult.error
      });
    }
  }
  
  next();
}

/**
 * Validates file for edge function uploads (without Express types)
 * Returns validation result for use in Supabase Edge Functions
 */
export function validateFileUpload(
  buffer: Uint8Array,
  mimeType: string,
  maxSize: number = 25 * 1024 * 1024
): { valid: boolean; error?: string } {
  // Check size
  if (buffer.length > maxSize) {
    return { valid: false, error: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB` };
  }
  
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: "Only PNG, JPEG, and PDF files are allowed" };
  }
  
  // Validate magic numbers
  const nodeBuffer = Buffer.from(buffer);
  if (!validateMagicNumber(nodeBuffer, mimeType)) {
    return { valid: false, error: "File content does not match declared type" };
  }
  
  return { valid: true };
}
