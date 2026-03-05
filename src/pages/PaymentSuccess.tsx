import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, FileText, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { session_id: sessionId }
      });

      if (error) throw error;
      setPaymentDetails(data);
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Payment Successful!
          </CardTitle>
          <CardDescription>
            Your IP filing is now being processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentDetails && (
            <div className="bg-gray-50 p-4 rounded-lg text-left space-y-2">
              <p className="text-sm">
                <strong>Filing:</strong> {paymentDetails.filing?.title}
              </p>
              <p className="text-sm">
                <strong>Type:</strong> {paymentDetails.filing?.type}
              </p>
              <p className="text-sm">
                <strong>Amount:</strong> ${(paymentDetails.amount_total / 100).toFixed(2)}
              </p>
              {sessionId && (
                <p className="text-sm">
                  <strong>Transaction ID:</strong> {sessionId.slice(-8)}
                </p>
              )}
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">What's Next?</span>
            </div>
            <p className="text-sm text-blue-800">
              Our AI is now generating your IP filing documents. You'll receive an email 
              when they're ready for download (usually within 5-10 minutes).
            </p>
          </div>

          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Link>
            </Button>
            {searchParams.get('type') === 'provisional' ? (
              <Button asChild className="flex-1">
                <Link to="/provisional">
                  <FileText className="w-4 h-4 mr-2" />
                  View Patent Status
                </Link>
              </Button>
            ) : (
              <Button asChild className="flex-1">
                <Link to="/filings">
                  <FileText className="w-4 h-4 mr-2" />
                  View Filings
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;