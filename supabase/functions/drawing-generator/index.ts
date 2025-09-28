import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      filing_id,
      asset_url,
      figure_label,
      overlays,
      stroke_width,
      pages // For multi-page drawing packs
    } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Generating patent drawing...');

    // For single drawing
    if (asset_url && !pages) {
      const drawingHtml = generateDrawingHTML(asset_url, figure_label, overlays, stroke_width);
      
      return new Response(
        JSON.stringify({
          success: true,
          html_content: drawingHtml,
          figure_label,
          overlays_count: overlays?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For multi-page drawing pack
    if (pages && Array.isArray(pages)) {
      let combinedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
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

      pages.forEach((page: DrawingPage, index: number) => {
        combinedHtml += `
          <div class="page">
            <div class="figure-title">${page.figure || `Figure ${index + 1}`}</div>
            <div class="drawing-container">
              <img src="${page.asset_url}" alt="${page.figure}" class="drawing-image" />
              ${page.overlays?.map((overlay: DrawingOverlay) => `
                <div class="overlay" style="left: ${overlay.x}px; top: ${overlay.y}px;">
                  ${overlay.text}
                </div>
              `).join('') || ''}
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
          pages_count: pages.length,
          total_overlays: pages.reduce((sum: number, page: DrawingPage) => sum + (page.overlays?.length || 0), 0)
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid drawing generation request');

  } catch (error: any) {
    console.error('Drawing generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Drawing generation failed',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateDrawingHTML(
  asset_url: string,
  figure_label: string,
  overlays: DrawingOverlay[],
  stroke_width: number = 2
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
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
        ${overlays?.map((overlay: DrawingOverlay) => `
          <div class="overlay" style="left: ${overlay.x}px; top: ${overlay.y}px;">
            ${overlay.text}
          </div>
        `).join('') || ''}
      </div>
    </body>
    </html>
  `;
}