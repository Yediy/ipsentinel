import React, { useState } from 'react';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DrawingUploader } from '@/components/drawings/DrawingUploader';
import { DrawingPackGenerator } from '@/components/drawings/DrawingPackGenerator';
import { toast } from 'sonner';

export default function DrawingsDemo() {
  const [results, setResults] = useState<Array<{ type: string; data: any }>>([]);

  const handleSuccess = (result: any, type: string) => {
    setResults(prev => [...prev, { type, data: result }]);
    console.log(`${type} result:`, result);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success('File downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patent Drawing Generator</h1>
            <p className="text-gray-600 mt-1">
              Generate patent-compliant technical drawings with automated vectorization and reference numerals
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Drawing Tools */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single Drawing</TabsTrigger>
                <TabsTrigger value="pack">Multi-Page Pack</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="mt-6">
                <DrawingUploader 
                  onSuccess={(result) => handleSuccess(result, 'Single Drawing')} 
                />
              </TabsContent>
              
              <TabsContent value="pack" className="mt-6">
                <DrawingPackGenerator 
                  onSuccess={(result) => handleSuccess(result, 'Drawing Pack')} 
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Generated Files</h3>
                
                {results.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Generated drawings will appear here...
                  </p>
                ) : (
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <h4 className="font-medium text-sm">{result.type}</h4>
                        
                        {/* PDF Download */}
                        {result.data.pdf_url && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(result.data.pdf_url, `drawing-${index + 1}.pdf`)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(result.data.pdf_url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        )}

                        {/* SVG Download (single drawings) */}
                        {result.data.svg_url && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(result.data.svg_url, `drawing-${index + 1}.svg`)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              SVG
                            </Button>
                          </div>
                        )}

                        {/* Pack Info */}
                        {result.data.pages && (
                          <p className="text-xs text-gray-600">
                            {result.data.pages} pages generated
                          </p>
                        )}

                        {/* SHA256 */}
                        {result.data.sha256 && (
                          <p className="text-xs text-gray-500 font-mono break-all">
                            SHA256: {result.data.sha256.substring(0, 16)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Clear Results */}
                {results.length > 0 && (
                  <Button
                    onClick={() => setResults([])}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                  >
                    Clear Results
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Instructions</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-900">Single Drawing:</h4>
                    <p>Upload one image and generate a patent-compliant drawing with reference numerals.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Multi-Page Pack:</h4>
                    <p>Combine multiple drawings into a single PDF document with consistent formatting.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Reference Numerals:</h4>
                    <p>Use JSON format: <code>[{`{"x":0.6,"y":0.3,"text":"10"}`}]</code> where x,y are 0-1 coordinates.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}