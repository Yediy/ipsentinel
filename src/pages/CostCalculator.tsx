import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, FileText, Globe, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CostBreakdown {
  ipsentinelFee: number;
  governmentFee: number;
  attorneyReview?: number;
  expeditedProcessing?: number;
  total: number;
}

const CostCalculator = () => {
  const [filingType, setFilingType] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [plan, setPlan] = useState<string>('basic');
  const [attorneyReview, setAttorneyReview] = useState(false);
  const [expedited, setExpedited] = useState(false);
  const [numClaims, setNumClaims] = useState<number>(3);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);

  const governmentFees = {
    patent: {
      usa: { micro: 400, small: 800, large: 1600 },
      canada: 500,
      eu: 600,
      wipo: 1200
    },
    trademark: {
      usa: 350,
      canada: 250,
      eu: 300,
      wipo: 653
    },
    copyright: {
      usa: 65,
      canada: 50,
      eu: 40,
      wipo: 0
    }
  };

  const ipsentinelFees = {
    free: 0,
    basic: 49,
    pro: 149,
    partner: 199
  };

  useEffect(() => {
    calculateCost();
  }, [filingType, country, plan, attorneyReview, expedited, numClaims]);

  const calculateCost = () => {
    if (!filingType || !country) {
      setCostBreakdown(null);
      return;
    }

    const ipsentinelFee = ipsentinelFees[plan as keyof typeof ipsentinelFees];
    let governmentFee = 0;

    // Calculate government fees
    if (filingType === 'patent') {
      const fees = governmentFees.patent[country as keyof typeof governmentFees.patent];
      if (typeof fees === 'object') {
        governmentFee = fees.small; // Default to small entity
      } else {
        governmentFee = fees || 0;
      }
      
      // Add extra claims fees for patents (USA)
      if (country === 'usa' && numClaims > 3) {
        governmentFee += (numClaims - 3) * 100;
      }
    } else {
      governmentFee = governmentFees[filingType as keyof typeof governmentFees]?.[country as keyof any] || 0;
    }

    let total = ipsentinelFee + governmentFee;
    const breakdown: CostBreakdown = {
      ipsentinelFee,
      governmentFee,
      total
    };

    // Add attorney review fee
    if (attorneyReview) {
      breakdown.attorneyReview = 299;
      total += 299;
    }

    // Add expedited processing fee
    if (expedited) {
      breakdown.expeditedProcessing = 199;
      total += 199;
    }

    breakdown.total = total;
    setCostBreakdown(breakdown);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPlanFeatures = (planType: string) => {
    const features = {
      free: ['Demo interview', 'Document preview', 'No export'],
      basic: ['AI-generated filing', 'USPTO compliance', 'Email support'],
      pro: ['Everything in Basic', 'Attorney review', 'Priority filing', 'IP monitoring'],
      partner: ['Everything in Pro', 'Multiple IP types', 'Global filing', 'Dedicated support']
    };
    return features[planType as keyof typeof features] || [];
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-full p-2">
          <Calculator className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Cost Calculator</h1>
          <p className="text-muted-foreground">
            Get transparent pricing for your IP filing
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Filing Details
            </CardTitle>
            <CardDescription>
              Tell us about your intellectual property filing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="filing-type">IP Type</Label>
              <Select value={filingType} onValueChange={setFilingType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select IP type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patent">Patent</SelectItem>
                  <SelectItem value="trademark">Trademark</SelectItem>
                  <SelectItem value="copyright">Copyright</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Filing Country/Region</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country/region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usa">United States</SelectItem>
                  <SelectItem value="canada">Canada</SelectItem>
                  <SelectItem value="eu">European Union</SelectItem>
                  <SelectItem value="wipo">WIPO (International)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Service Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free - $0</SelectItem>
                  <SelectItem value="basic">Basic - $49</SelectItem>
                  <SelectItem value="pro">Pro - $149</SelectItem>
                  <SelectItem value="partner">Partner - $199</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2">
                <p className="text-sm font-medium mb-2">Plan includes:</p>
                <div className="flex flex-wrap gap-1">
                  {getPlanFeatures(plan).map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {filingType === 'patent' && (
              <div className="space-y-2">
                <Label htmlFor="num-claims">Number of Claims</Label>
                <Input
                  id="num-claims"
                  type="number"
                  min="1"
                  max="20"
                  value={numClaims}
                  onChange={(e) => setNumClaims(parseInt(e.target.value) || 3)}
                />
                <p className="text-xs text-muted-foreground">
                  First 3 claims included. Additional claims: $100 each (USA only)
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="attorney-review">Attorney Review</Label>
                  <p className="text-xs text-muted-foreground">
                    Optional professional review (+$299)
                  </p>
                </div>
                <Switch
                  id="attorney-review"
                  checked={attorneyReview}
                  onCheckedChange={setAttorneyReview}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="expedited">Expedited Processing</Label>
                  <p className="text-xs text-muted-foreground">
                    Priority filing queue (+$199)
                  </p>
                </div>
                <Switch
                  id="expedited"
                  checked={expedited}
                  onCheckedChange={setExpedited}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Breakdown
            </CardTitle>
            <CardDescription>
              Transparent pricing with no hidden fees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {costBreakdown ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">IPSentinel Service Fee</span>
                    <span className="font-medium">
                      {formatCurrency(costBreakdown.ipsentinelFee)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Government Filing Fee</span>
                    <span className="font-medium">
                      {formatCurrency(costBreakdown.governmentFee)}
                    </span>
                  </div>

                  {costBreakdown.attorneyReview && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Attorney Review</span>
                      <span className="font-medium">
                        {formatCurrency(costBreakdown.attorneyReview)}
                      </span>
                    </div>
                  )}

                  {costBreakdown.expeditedProcessing && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Expedited Processing</span>
                      <span className="font-medium">
                        {formatCurrency(costBreakdown.expeditedProcessing)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total Cost</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(costBreakdown.total)}
                    </span>
                  </div>
                </div>

                <div className="bg-accent/30 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-sm space-y-1">
                      <p className="font-medium">What's included:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• AI-powered document generation</li>
                        <li>• USPTO/USCO compliance checking</li>
                        <li>• Real-time filing status updates</li>
                        <li>• Secure document storage</li>
                        <li>• Email support throughout process</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button className="w-full" size="lg">
                  Start Filing Process
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select your filing details to see cost breakdown
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CostCalculator;