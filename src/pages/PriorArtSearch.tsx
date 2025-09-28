import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  doc: string;
  country: string;
  date: string;
  title: string;
}

const PriorArtSearch = () => {
  const [query, setQuery] = useState('');
  const [ipc, setIpc] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter search keywords');
      return;
    }

    setSearching(true);
    try {
      // This would call the EPO OPS search edge function
      const mockResults: SearchResult[] = [
        {
          doc: 'US20240001234A1',
          country: 'US',
          date: '2024-01-04',
          title: 'Method and system for automated patent analysis using artificial intelligence'
        },
        {
          doc: 'EP3999999A1',
          country: 'EP',
          date: '2023-12-15',
          title: 'Intelligent document processing system with machine learning capabilities'
        },
        {
          doc: 'CN117888888A',
          country: 'CN',
          date: '2023-11-28',
          title: 'AI-powered intellectual property management platform'
        },
        {
          doc: 'JP2023-777777A',
          country: 'JP',
          date: '2023-10-12',
          title: 'Automated patent drafting system using natural language processing'
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResults(mockResults);
      toast.success(`Found ${mockResults.length} results`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      'US': '🇺🇸',
      'EP': '🇪🇺',
      'CN': '🇨🇳',
      'JP': '🇯🇵',
      'KR': '🇰🇷',
      'GB': '🇬🇧',
      'CA': '🇨🇦',
      'AU': '🇦🇺'
    };
    return flags[country] || '🌍';
  };

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-primary/10 rounded-full p-2">
            <Lightbulb className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Prior Art Search</h1>
        </div>
        <p className="text-muted-foreground">
          Search worldwide patent databases using EPO OPS
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Search Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  placeholder="e.g., artificial intelligence, machine learning"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipc">IPC Classification (optional)</Label>
                <Input
                  id="ipc"
                  placeholder="e.g., G06F, H04L"
                  value={ipc}
                  onChange={(e) => setIpc(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  International Patent Classification code
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? 'Searching...' : 'Search Patents'}
              </Button>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Search Tips
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Use specific technical terms</li>
                  <li>• Combine keywords with AND/OR</li>
                  <li>• Include IPC codes for better results</li>
                  <li>• Search covers worldwide patents</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              {results.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Found {results.length} patent documents
                </p>
              )}
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searching ? 'Searching worldwide patent databases...' : 'Enter keywords to search for prior art'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCountryFlag(result.country)}</span>
                          <Badge variant="outline" className="font-mono">
                            {result.doc}
                          </Badge>
                          <Badge variant="secondary">
                            {result.country}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-2">
                        {result.title}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Published: {formatDate(result.date)}</span>
                        <span>•</span>
                        <span>Country: {result.country}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          <strong>Powered by EPO OPS:</strong> Search results from the European Patent Office's 
          Open Patent Services, covering worldwide patent publications.
        </p>
      </div>
    </div>
  );
};

export default PriorArtSearch;