import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, Info } from "lucide-react";

interface FeeStructure {
  [key: string]: {
    [key: string]: number | { micro: number; small: number; large: number };
  };
}

const IPGenieCostCalculator = () => {
  const [type, setType] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [classes, setClasses] = useState(1);
  const [drawings, setDrawings] = useState(0);
  const [translation, setTranslation] = useState(0);
  const [entitySize, setEntitySize] = useState('small');

  // Government fees structure
  const govFees: FeeStructure = {
    patent: {
      US: { micro: 400, small: 800, large: 1600 },
      CN: 950,
      EP: 1250,
      JP: 350,
      KR: 300,
      GB: 280,
      CA: 400,
      AU: 370
    },
    trademark: {
      US: 350,
      CN: 210,
      EP: 900,
      JP: 200,
      KR: 180,
      GB: 170,
      CA: 250,
      AU: 200
    },
    copyright: {
      US: 65,
      CN: 100,
      EP: 40,
      JP: 60,
      KR: 50,
      GB: 35,
      CA: 50,
      AU: 55
    }
  };

  const calculateGovFee = () => {
    if (!type || !countryCode) return 0;
    
    const fee = govFees[type]?.[countryCode];
    if (!fee) return 0;
    
    if (typeof fee === 'object') {
      // US patent fees with entity sizes
      return fee[entitySize as keyof typeof fee] || 0;
    }
    
    // Flat fee
    let baseFee = fee;
    
    // For trademarks, multiply by number of classes
    if (type === 'trademark' && classes > 1) {
      baseFee *= classes;
    }
    
    return baseFee;
  };

  const govFee = calculateGovFee();
  const totalExtras = drawings + translation;
  const totalEstimate = govFee + totalExtras;

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-primary/10 rounded-full p-2">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Cost Calculator</h1>
        </div>
        <p className="text-muted-foreground">
          Get transparent estimates for your IP filing costs
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Filing Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>IP Type</Label>
              <Select value={type} onValueChange={setType}>
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
              <Label>Country</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CN">China</SelectItem>
                  <SelectItem value="EP">European Union</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="KR">South Korea</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'patent' && countryCode === 'US' && (
              <div className="space-y-2">
                <Label>Entity Size</Label>
                <Select value={entitySize} onValueChange={setEntitySize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro Entity</SelectItem>
                    <SelectItem value="small">Small Entity</SelectItem>
                    <SelectItem value="large">Large Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'trademark' && (
              <div className="space-y-2">
                <Label>Number of Classes</Label>
                <Input
                  type="number"
                  min="1"
                  max="45"
                  value={classes}
                  onChange={(e) => setClasses(parseInt(e.target.value) || 1)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Drawings Cost (USD)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={drawings || ''}
                onChange={(e) => setDrawings(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Translation Cost (USD)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={translation || ''}
                onChange={(e) => setTranslation(parseInt(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {type && countryCode ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Government Fees</span>
                    <Badge variant="outline" className="font-mono">
                      ${govFee.toLocaleString()}
                    </Badge>
                  </div>

                  {drawings > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Drawings</span>
                      <Badge variant="outline" className="font-mono">
                        ${drawings.toLocaleString()}
                      </Badge>
                    </div>
                  )}

                  {translation > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Translation</span>
                      <Badge variant="outline" className="font-mono">
                        ${translation.toLocaleString()}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total Estimate</span>
                    <span className="text-2xl font-bold text-primary">
                      ${totalEstimate.toLocaleString()}
                    </span>
                  </div>
                </div>

                {type === 'patent' && countryCode === 'US' && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      US Patent Entity Types
                    </h4>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <p><strong>Micro:</strong> Individuals, small businesses (&lt;$200k revenue)</p>
                      <p><strong>Small:</strong> Companies with &lt;500 employees</p>
                      <p><strong>Large:</strong> Large corporations</p>
                    </div>
                  </div>
                )}

                <div className="bg-accent/30 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm space-y-2">
                      <p className="font-medium">Estimates based on official fee schedules</p>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Government fees are current as of 2024</li>
                        <li>• Additional attorney/agent fees not included</li>
                        <li>• Actual costs may vary by complexity</li>
                        <li>• Some countries offer discounts for certain entities</li>
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
                  Select IP type and country to see cost estimate
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          <strong>Disclaimer:</strong> IPGenie prepares documents and drawings. 
          It is not legal advice. You are responsible for your filings and compliance with local rules.
        </p>
      </div>
    </div>
  );
};

export default IPGenieCostCalculator;