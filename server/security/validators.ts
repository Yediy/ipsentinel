import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

export const DrawPackSchema = z.object({
  filing_id: z.string().uuid(),
  jurisdiction: z.string().min(2).max(2),
  sheet: z.enum(["LETTER", "A4"]),
  pages: z.array(
    z.object({
      asset_url: z.string().url(),
      figure: z.string().min(1).max(20)
    })
  ).min(1)
});

export const TransformSchema = z.object({
  filing_id: z.string().uuid(),
  office: z.enum(["EP", "CN", "PCT"])
});

export const ExportZipSchema = z.object({
  filing_id: z.string().uuid(),
  include_xml: z.boolean().optional().default(true),
  include_pdfs: z.boolean().optional().default(true)
});

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const src = req.method === "GET" ? req.query : req.body;
    const parsed = schema.safeParse(src);
    
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation",
        details: parsed.error.flatten()
      });
    }
    
    if (req.method === "GET") {
      (req as any).validated = parsed.data;
    } else {
      req.body = parsed.data;
    }
    
    next();
  };
}
