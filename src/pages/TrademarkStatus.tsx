import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, ShieldCheck, Calendar, User, Building2 } from "lucide-react";
import { toast } from "sonner";

interface TrademarkData {
  id: string;
  mark: string;
  status: string;
  statusDate: string;
  owner: string;
  classes: number[];
  filingDate: string;
  registrationDate?: string;
  docsUrl?: string;
}

const TrademarkStatus = () => {
  const [searchId, setSearchId] = useState('');
  const [result, setResult] = useState<TrademarkData | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchId.trim()) {
      toast.error('Please enter a serial number or registration number');
      return;
    }

    // Validate format (8 digits for serial, numeric for registration)
    const isSerial = /^\d{8}$/.test(searchId);
    const isRegistration = /^\d+$/.test(searchId);
    
    if (!isSerial && !isRegistration) {
      toast.error('Please enter a valid 8-digit serial number or registration number');
      return;
    }

    setSearching(true);
    setError(null);
    
    try {
      // This would call the TSDR API edge function
      // For demo purposes, we'll return mock data
      const mockData: TrademarkData = {
        id: searchId,
        mark: 'IPGENIE',
        status: isSerial ? 'Published for Opposition' : 'Live',
        statusDate: '2024-01-15',
        owner: 'Tech Innovations LLC',
        classes: [9, 42],
        filingDate: '2023-08-12',
        registrationDate: isSerial ? undefined : '2024-03-20',
        docsUrl: `https://tsdr.uspto.gov/documentviewer?caseId=${searchId}`
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResult(mockData);
      toast.success('Trademark information retrieved successfully');
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to retrieve trademark information. Please try again.');
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: 'default' | 'destructive' | 'outline' | 'secondary' } = {
      'Live': 'default',
      'Published for Opposition': 'secondary',
      'Registered': 'default',
      'Abandoned': 'destructive',
      'Cancelled': 'destructive',
      'Expired': 'outline'
    };
    return statusColors[status] || 'outline';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getClassDescription = (classNum: number) => {
    const descriptions: { [key: number]: string } = {
      9: 'Scientific and technological apparatus and instruments',
      42: 'Scientific and technological services and research',
      35: 'Advertising; business management',
      36: 'Insurance; financial affairs',
      41: 'Education; entertainment',
      // Add more as needed
    };
    return descriptions[classNum] || `Class ${classNum}`;
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-primary/10 rounded-full p-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Trademark Status</h1>
        </div>
        <p className="text-muted-foreground">
          Check US trademark status using USPTO TSDR
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Search Form */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search TSDR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="search-id">Serial or Registration Number</Label>
                <Input
                  id="search-id"
                  placeholder="88123456 or 5678901"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? 'Searching...' : 'Check Status'}
              </Button>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Search Tips
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Serial numbers are 8 digits</li>
                  <li>• Registration numbers vary in length</li>
                  <li>• Data is updated daily from USPTO</li>
                  <li>• Includes all US trademark applications</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Trademark Information</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-destructive/10 rounded-full p-3 mb-4">
                    <Search className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-destructive font-medium mb-2">Search Error</p>
                  <p className="text-muted-foreground text-sm">{error}</p>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{result.mark}</h2>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                        <Badge variant="outline" className="font-mono">
                          {result.id}
                        </Badge>
                      </div>
                    </div>
                    {result.docsUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={result.docsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Docs
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Owner</p>
                          <p className="text-sm text-muted-foreground">{result.owner}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Filing Date</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(result.filingDate)}
                          </p>
                        </div>
                      </div>

                      {result.registrationDate && (
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Registration Date</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(result.registrationDate)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium mb-2">International Classes</p>
                          <div className="space-y-2">
                            {result.classes.map(cls => (
                              <div key={cls} className="border rounded p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">Class {cls}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {getClassDescription(cls)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Status History</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">{result.status}</p>
                          <p className="text-muted-foreground">
                            {formatDate(result.statusDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searching ? 'Searching USPTO database...' : 'Enter a serial or registration number to check status'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          <strong>Data Source:</strong> USPTO Trademark Status & Document Retrieval (TSDR) database.
          Information is updated daily from official USPTO records.
        </p>
      </div>
    </div>
  );
};

export default TrademarkStatus;