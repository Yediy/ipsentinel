// Type definitions for improved type safety across the application

export interface FilingError extends Error {
  message: string;
  code?: string;
}

export interface FilingResponse {
  data: any;
  error: FilingError | null;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  similarity_score?: number;
  source?: string;
}

export interface TrademarSearchResults {
  similar_marks: SearchResult[];
  exact_matches: SearchResult[];
  risk_assessment: {
    level: 'low' | 'medium' | 'high';
    score: number;
    concerns: string[];
    recommendations: string[];
  };
}

export interface ClassificationResult {
  suggested_classes: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  confidence: number;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  logError?: boolean;
}

export function handleError(
  error: unknown, 
  context: string, 
  options: ErrorHandlerOptions = {}
): string {
  const { 
    showToast = true, 
    fallbackMessage = 'An unexpected error occurred',
    logError = true 
  } = options;
  
  let errorMessage = fallbackMessage;
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  if (logError) {
    console.error(`Error in ${context}:`, error);
  }
  
  return errorMessage;
}

export interface PatentFormData {
  title: string;
  abstract: string;
  background: string;
  summary: string;
  detailed_description: string;
  claims: string;
  features: string;
  prior_art: string;
  problem: string;
  solution: string;
}

export interface FileUploadData {
  file: File;
  type: string;
  description?: string;
}