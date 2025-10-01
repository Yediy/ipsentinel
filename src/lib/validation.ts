import { z } from 'zod';

// Drawing generation schemas
export const DrawGenerateSchema = z.object({
  filing_id: z.string().uuid('Invalid filing ID'),
  asset_url: z.string().url('Invalid asset URL'),
  figure: z.string().min(1).max(20, 'Figure name must be 1-20 characters'),
  jurisdiction: z.string().length(2, 'Jurisdiction must be 2 characters'),
  sheet: z.enum(['LETTER', 'A4']),
  strokeWidth: z.number().min(0.5).max(5).default(1),
  overlays: z.array(z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    text: z.string().min(1).max(10)
  })).optional()
});

export const DrawPackSchema = z.object({
  filing_id: z.string().uuid('Invalid filing ID'),
  jurisdiction: z.string().length(2, 'Jurisdiction must be 2 characters'),
  sheet: z.enum(['LETTER', 'A4']),
  strokeWidth: z.number().min(0.5).max(5).default(1),
  pages: z.array(z.object({
    asset_url: z.string().url('Invalid asset URL'),
    figure: z.string().min(1).max(20),
    overlays: z.array(z.object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      text: z.string().min(1).max(10)
    })).optional()
  })).min(1, 'At least one page required')
});

// Filing schemas
export const PatentFilingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  abstract: z.string().min(50, 'Abstract must be at least 50 characters').max(5000).optional(),
  background: z.string().max(10000).optional(),
  summary: z.string().max(10000).optional(),
  detailed_description: z.string().max(50000).optional(),
  claims: z.string().max(25000).optional(),
  country_code: z.string().length(2, 'Country code must be 2 characters'),
  type: z.enum(['patent', 'trademark', 'copyright']),
});

export const TrademarkFilingSchema = z.object({
  title: z.string().min(2, 'Mark name must be at least 2 characters').max(200),
  tm_mark_text: z.string().min(1).max(500).optional(),
  tm_mark_type: z.enum(['word', 'design', 'composite']).optional(),
  tm_classes: z.array(z.string()).optional(),
  country_code: z.string().length(2, 'Country code must be 2 characters'),
  type: z.literal('trademark'),
});

export const CopyrightFilingSchema = z.object({
  title: z.string().min(2, 'Work title must be at least 2 characters').max(500),
  work_type: z.string().min(2).max(100),
  authorship_description: z.string().max(5000).optional(),
  owner_name: z.string().min(2).max(200),
  country_code: z.string().length(2, 'Country code must be 2 characters'),
  type: z.literal('copyright'),
});

// User input schemas
export const ContactEmailSchema = z.string().email('Invalid email address');
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const URLSchema = z.string().url('Invalid URL format');

// Helper function to validate and return errors
export function validateSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
