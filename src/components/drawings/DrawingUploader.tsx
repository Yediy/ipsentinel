import React, { useState } from 'react';
import { Upload, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface DrawingUploaderProps {
  filingId?: string;
  onSuccess?: (result: any) => void;
}

export const DrawingUploader: React.FC<DrawingUploaderProps> = ({ filingId, onSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedAsset, setUploadedAsset] = useState<{ url: string; sha256: string } | null>(null);
  const [figure, setFigure] = useState('FIG. 1');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [overlays, setOverlays] = useState('[]');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/drawings/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      setUploadedAsset(result);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateDrawing = async () => {
    if (!uploadedAsset) {
      toast.error('Please upload an image first');
      return;
    }

    setIsGenerating(true);
    try {
      let parsedOverlays = [];
      try {
        parsedOverlays = JSON.parse(overlays);
      } catch (e) {
        console.warn('Invalid overlays JSON, using empty array');
      }

      const payload = {
        asset_url: uploadedAsset.url,
        figure,
        strokeWidth,
        overlays: parsedOverlays,
        ...(filingId && { filing_id: filingId }),
      };

      const response = await fetch('/api/drawings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Generation failed');

      const result = await response.json();
      toast.success('Patent drawing generated successfully!');
      onSuccess?.(result);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate patent drawing');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Patent Drawing Generator
        </CardTitle>
        <CardDescription>
          Upload images and generate patent-compliant technical drawings with reference numerals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="image-upload">Upload Source Image</Label>
          <div className="flex items-center gap-4">
            <Input
              id="image-upload"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <p className="text-sm text-muted-foreground">
            Supports PNG, JPG, and SVG files. Images will be converted to patent-compliant line art.
          </p>
        </div>

        {uploadedAsset && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ Image uploaded successfully - Ready for processing
            </p>
          </div>
        )}

        {/* Drawing Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="figure">Figure Label</Label>
            <Input
              id="figure"
              value={figure}
              onChange={(e) => setFigure(e.target.value)}
              placeholder="FIG. 1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stroke-width">Stroke Width (px)</Label>
            <Input
              id="stroke-width"
              type="number"
              min="1"
              max="3"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        {/* Reference Numerals */}
        <div className="space-y-2">
          <Label htmlFor="overlays">Reference Numerals (JSON)</Label>
          <Textarea
            id="overlays"
            value={overlays}
            onChange={(e) => setOverlays(e.target.value)}
            placeholder='[{"x":0.6,"y":0.3,"text":"10"},{"x":0.4,"y":0.7,"text":"20"}]'
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Add reference numerals with x,y coordinates (0-1) and text labels. Auto-snapping will align to drawing elements.
          </p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateDrawing}
          disabled={!uploadedAsset || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Patent Drawing...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Patent Drawing
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Images are converted to monochrome line art suitable for patent applications</p>
          <p>• Reference numerals are automatically snapped to drawing elements</p>
          <p>• Output complies with USPTO, EPO, and other international patent office requirements</p>
        </div>
      </CardContent>
    </Card>
  );
};