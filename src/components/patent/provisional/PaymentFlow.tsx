import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader, Check, FileText, Shield, Star, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentFlowProps {
  intakeId: string;
  qualityScore: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'AI-generated provisional patent draft',
    features: [
      'Full specification document',
      'Claims section (10+ claims)',
      'Figure prompts for drawings',
      'Prior art keyword analysis',
      '72-hour delivery'
    ]
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 129,
    description: 'Enhanced draft with quality review',
    features: [
      'Everything in Starter',
      'Technical review by AI agent',
      'Claim dependency optimization',
      'Abstract & summary polish',
      'Priority support',
      '48-hour delivery'
    ],
    recommended: true
  },
  {
    id: 'pro_plus',
    name: 'Professional+',
    price: 199,
    description: 'Complete protection package',
    features: [
      'Everything in Professional',
      'Continuation claim drafts',
      'Design patent suggestions',
      'International filing roadmap',
      'Dedicated support',
      '24-hour delivery'
    ]
  }
];

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  intakeId,
  qualityScore,
  onSuccess,
  onCancel
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('pro');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const { data, error } = await supabase.functions.invoke('provisional-payment', {
        body: {
          intake_id: intakeId,
          tier: selectedTier
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = PRICING_TIERS.find(t => t.id === selectedTier);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Choose Your Plan</h2>
        <p className="text-muted-foreground">
          Quality Score: <Badge variant="secondary">{(qualityScore * 100).toFixed(0)}%</Badge>
        </p>
      </div>

      <RadioGroup
        value={selectedTier}
        onValueChange={setSelectedTier}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {PRICING_TIERS.map((tier) => (
          <Label
            key={tier.id}
            htmlFor={tier.id}
            className="cursor-pointer"
          >
            <Card className={`relative h-full transition-all ${
              selectedTier === tier.id 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:border-primary/50'
            }`}>
              {tier.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Star className="h-3 w-3" />
                    Recommended
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <RadioGroupItem value={tier.id} id={tier.id} />
                </div>
                <div className="text-3xl font-bold text-primary">
                  ${tier.price}
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Label>
        ))}
      </RadioGroup>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Secure Payment via Stripe</p>
                <p className="text-sm text-muted-foreground">
                  Your payment information is encrypted and secure
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">${selectedPlan?.price}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onCancel}>
          Back to Editor
        </Button>
        <Button 
          size="lg" 
          onClick={handleCheckout}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Proceed to Checkout
            </>
          )}
        </Button>
      </div>
    </div>
  );
};