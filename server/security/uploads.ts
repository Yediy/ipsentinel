import multer from "multer";
import type { Request, Response, NextFunction } from "express";

export const anyUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_BYTES || String(25 * 1024 * 1024), 10)
  }
});

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "application/pdf"
]);

export function ensureAllowed(req: Request, res: Response, next: NextFunction) {
  const f = (req as any).file as Express.Multer.File | undefined;
  
  if (!f) {
    return res.status(400).json({ error: "NoFile" });
  }
  
  if (!ALLOWED.has(f.mimetype || "")) {
    return res.status(415).json({ error: "UnsupportedMediaType" });
  }
  
  next();
}
