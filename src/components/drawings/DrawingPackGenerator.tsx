import React, { useState } from 'react';
import { Package, Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface DrawingPage {
  asset_url: string;
  figure: string;
  overlays: Array<{ x: number; y: number; text: string; }>;
}

interface DrawingPackGeneratorProps {
  filingId?: string;
  onSuccess?: (result: any) => void;
}

export const DrawingPackGenerator: React.FC<DrawingPackGeneratorProps> = ({ filingId, onSuccess }) => {
  const [pages, setPages] = useState<DrawingPage[]>([
    { asset_url: '', figure: 'FIG. 1', overlays: [] }
  ]);
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const addPage = () => {
    setPages([...pages, { 
      asset_url: '', 
      figure: `FIG. ${pages.length + 1}`, 
      overlays: [] 
    }]);
  };

  const removePage = (index: number) => {
    if (pages.length > 1) {
      setPages(pages.filter((_, i) => i !== index));
    }
  };

  const updatePage = (index: number, field: keyof DrawingPage, value: any) => {
    const updatedPages = [...pages];
    if (field === 'overlays') {
      try {
        updatedPages[index][field] = JSON.parse(value);
      } catch (e) {
        // Keep the string value for editing, will validate on submit
        return;
      }
    } else {
      updatedPages[index][field] = value;
    }
    setPages(updatedPages);
  };

  const handleGeneratePack = async () => {
    // Validate that all pages have asset URLs
    const validPages = pages.filter(page => page.asset_url.trim());
    if (validPages.length === 0) {
      toast.error('Please provide at least one image URL');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        pages: validPages,
        strokeWidth,
        ...(filingId && { filing_id: filingId }),
      };

      const response = await fetch('/api/drawings/generate-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Pack generation failed');

      const result = await response.json();
      toast.success(`Multi-page drawing pack generated with ${result.pages} pages!`);
      onSuccess?.(result);
    } catch (error) {
      console.error('Pack generation error:', error);
      toast.error('Failed to generate drawing pack');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Multi-Page Drawing Pack Generator
        </CardTitle>
        <CardDescription>
          Create a comprehensive patent drawing package with multiple figures and reference numerals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Settings */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="pack-stroke-width">Stroke Width (px)</Label>
            <Input
              id="pack-stroke-width"
              type="number"
              min="1"
              max="3"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value) || 1)}
              className="w-20"
            />
          </div>
          <div className="flex-1" />
          <Button onClick={addPage} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
        </div>

        {/* Pages Configuration */}
        <div className="space-y-4">
          {pages.map((page, index) => (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Page {index + 1}</CardTitle>
                  {pages.length > 1 && (
                    <Button
                      onClick={() => removePage(index)}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`asset-url-${index}`}>Image URL</Label>
                    <Input
                      id={`asset-url-${index}`}
                      value={page.asset_url}
                      onChange={(e) => updatePage(index, 'asset_url', e.target.value)}
                      placeholder="https://example.com/image.png"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`figure-${index}`}>Figure Label</Label>
                    <Input
                      id={`figure-${index}`}
                      value={page.figure}
                      onChange={(e) => updatePage(index, 'figure', e.target.value)}
                      placeholder={`FIG. ${index + 1}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`overlays-${index}`}>Reference Numerals (JSON)</Label>
                  <Textarea
                    id={`overlays-${index}`}
                    value={JSON.stringify(page.overlays, null, 2)}
                    onChange={(e) => updatePage(index, 'overlays', e.target.value)}
                    placeholder='[{"x":0.6,"y":0.3,"text":"10"},{"x":0.4,"y":0.7,"text":"20"}]'
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGeneratePack}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Drawing Pack...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Multi-Page Drawing Pack
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• All pages will be combined into a single PDF with consistent formatting</p>
          <p>• Each page will be automatically vectorized and optimized for patent applications</p>
          <p>• Reference numerals will be auto-snapped to drawing elements on each page</p>
          <p>• Output complies with international patent office drawing requirements</p>
        </div>
      </CardContent>
    </Card>
  );
};
