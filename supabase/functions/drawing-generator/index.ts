import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getValidatedCorsHeaders, createCorsPreflightResponse } from "../_shared/cors-validator.ts";

interface DrawingOverlay {
  x: number;
  y: number;
  text: string;
}

interface DrawingPage {
  asset_url: string;
  figure: string;
  overlays: DrawingOverlay[];
}

// Security: HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Security: Validate and sanitize numeric coordinates
function validateCoordinate(value: unknown, max: number = 10000): number {
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > max) {
    throw new Error(`Invalid coordinate value: must be between 0 and ${max}`);
  }
  return Math.floor(num); // Return integer only
}

// Security: Validate stroke width
function validateStrokeWidth(value: unknown): number {
  const num = Number(value);
  if (isNaN(num) || num < 1 || num > 10) {
    return 2; // Default safe value
  }
  return Math.floor(num);
}

// Security: Validate asset URL - only allow Supabase storage URLs
function validateAssetUrl(url: string): string {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Invalid asset URL: URL is required');
  }
  
  try {
    const parsedUrl = new URL(url);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseHost = new URL(supabaseUrl).hostname;
    
    // Allow only Supabase storage URLs
    const allowedHosts = [supabaseHost, `${supabaseHost.replace('.supabase.co', '.supabase.co')}`];
    
    if (!allowedHosts.some(host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.supabase.co'))) {
      throw new Error('Invalid asset URL: Only Supabase storage URLs are allowed');
    }
    
    // Ensure HTTPS
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Invalid asset URL: HTTPS required');
    }
    
    return url;
  } catch (e) {
    if (e instanceof Error && e.message.includes('Invalid asset URL')) {
      throw e;
    }
    throw new Error('Invalid asset URL: Malformed URL');
  }
}

// Security: Validate and truncate text input
function validateText(text: string, maxLength: number = 100): string {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (trimmed.length > maxLength) {
    return escapeHtml(trimmed.substring(0, maxLength));
  }
  return escapeHtml(trimmed);
}

// Security: Validate overlay array
function validateOverlays(overlays: unknown): DrawingOverlay[] {
  if (!overlays || !Array.isArray(overlays)) {
    return [];
  }
  
  // Limit number of overlays
  const maxOverlays = 100;
  const safeOverlays = overlays.slice(0, maxOverlays);
  
  return safeOverlays.map((overlay) => ({
    x: validateCoordinate(overlay?.x),
    y: validateCoordinate(overlay?.y),
    text: validateText(overlay?.text || '', 50)
  }));
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getValidatedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    const jwt = authHeader.slice(7).trim();
    
    // Create authenticated Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` }}
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
    
    const { 
      filing_id,
      asset_url,
      figure_label,
      overlays,
      stroke_width,
      pages // For multi-page drawing packs
    } = await req.json();

    console.log('Generating patent drawing...');

    // For single drawing
    if (asset_url && !pages) {
      // Validate inputs
      const safeAssetUrl = validateAssetUrl(asset_url);
      const safeFigureLabel = validateText(figure_label || 'Figure 1', 100);
      const safeOverlays = validateOverlays(overlays);
      const safeStrokeWidth = validateStrokeWidth(stroke_width);
      
      const drawingHtml = generateDrawingHTML(safeAssetUrl, safeFigureLabel, safeOverlays, safeStrokeWidth);
      
      return new Response(
        JSON.stringify({
          success: true,
          html_content: drawingHtml,
          figure_label: safeFigureLabel,
          overlays_count: safeOverlays.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For multi-page drawing pack
    if (pages && Array.isArray(pages)) {
      // Limit number of pages
      const maxPages = 50;
      const safePages = pages.slice(0, maxPages);
      
      let combinedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://*.supabase.co; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' https://*.supabase.co data:;">
          <title>Patent Drawing Pack</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
            }
            .page {
              page-break-after: always;
              margin-bottom: 50px;
              position: relative;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            .drawing-container {
              position: relative;
              display: inline-block;
              margin: 20px 0;
            }
            .drawing-image {
              max-width: 100%;
              height: auto;
              border: 1px solid #000;
            }
            .overlay {
              position: absolute;
              background: white;
              border: 2px solid #000;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
            }
            .figure-title {
              text-align: center;
              font-weight: bold;
              margin: 10px 0;
              font-size: 14px;
            }
            .header {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 30px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">PATENT DRAWINGS</div>
      `;

      let totalOverlays = 0;
      
      safePages.forEach((page: DrawingPage, index: number) => {
        // Validate each page's inputs
        const safeAssetUrl = validateAssetUrl(page.asset_url);
        const safeFigure = validateText(page.figure || `Figure ${index + 1}`, 100);
        const safeOverlays = validateOverlays(page.overlays);
        totalOverlays += safeOverlays.length;
        
        combinedHtml += `
          <div class="page">
            <div class="figure-title">${safeFigure}</div>
            <div class="drawing-container">
              <img src="${safeAssetUrl}" alt="${safeFigure}" class="drawing-image" />
              ${safeOverlays.map((overlay: DrawingOverlay) => `
                <div class="overlay" style="left: ${overlay.x}px; top: ${overlay.y}px;">
                  ${overlay.text}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });

      combinedHtml += `
          </body>
        </html>
      `;

      return new Response(
        JSON.stringify({
          success: true,
          html_content: combinedHtml,
          pages_count: safePages.length,
          total_overlays: totalOverlays
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid drawing generation request');

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Drawing generation failed';
    console.error('Drawing generation error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      {
        status: 500,
        headers: { ...getValidatedCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateDrawingHTML(
  asset_url: string, // Already validated
  figure_label: string, // Already escaped
  overlays: DrawingOverlay[], // Already validated and escaped
  stroke_width: number // Already validated
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://*.supabase.co; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' https://*.supabase.co data:;">
      <title>Patent Drawing - ${figure_label}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px;
          text-align: center;
        }
        .drawing-container {
          position: relative;
          display: inline-block;
          margin: 20px 0;
        }
        .drawing-image {
          max-width: 100%;
          height: auto;
          border: 1px solid #000;
        }
        .overlay {
          position: absolute;
          background: white;
          border: ${stroke_width}px solid #000;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
        }
        .figure-title {
          font-weight: bold;
          margin: 10px 0;
          font-size: 16px;
        }
        .header {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">PATENT DRAWING</div>
      <div class="figure-title">${figure_label}</div>
      <div class="drawing-container">
        <img src="${asset_url}" alt="${figure_label}" class="drawing-image" />
        ${overlays.map((overlay: DrawingOverlay) => `
          <div class="overlay" style="left: ${overlay.x}px; top: ${overlay.y}px;">
            ${overlay.text}
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;
}
