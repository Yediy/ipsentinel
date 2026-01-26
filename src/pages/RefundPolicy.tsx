import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RefundPolicy = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Refund Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: January 26, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                IP Sentinel is committed to customer satisfaction. This Refund Policy outlines the circumstances 
                under which refunds may be granted for our intellectual property filing services. Please read 
                this policy carefully before making a purchase.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">2. Service Nature</h2>
              <p className="text-muted-foreground leading-relaxed">
                IP Sentinel provides digital services for preparing and managing intellectual property filings. 
                Once you begin using our document generation, filing preparation, or deadline tracking services, 
                you are consuming digital services that cannot be "returned" in the traditional sense.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">3. Refund Eligibility</h2>
              
              <h3 className="text-lg font-medium mt-4 mb-2">3.1 Eligible for Full Refund</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Payment made in error (duplicate charge, wrong amount)</li>
                <li>Service unavailable due to our technical issues preventing use</li>
                <li>Request made within 24 hours of purchase if no documents have been generated</li>
                <li>Subscription canceled before the billing period begins</li>
              </ul>

              <h3 className="text-lg font-medium mt-4 mb-2">3.2 Eligible for Partial Refund</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Significant service issues that prevented completion of intended filing</li>
                <li>Pro-rated refund for unused portion of subscription services</li>
                <li>Features advertised but not delivered as described</li>
              </ul>

              <h3 className="text-lg font-medium mt-4 mb-2">3.3 Not Eligible for Refund</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Documents have been generated and downloaded</li>
                <li>Filing data has been submitted to external agencies (USPTO, USCO, etc.)</li>
                <li>Change of mind after using the service</li>
                <li>Rejection of intellectual property application by government agencies (outcomes are not guaranteed)</li>
                <li>User error in providing incorrect filing information</li>
                <li>Request made more than 30 days after purchase</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">4. Government Filing Fees</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Important:</strong> Government filing fees (USPTO, USCO, EPO, CNIPA, or other agencies) 
                paid through our platform are collected on behalf of those agencies. These fees are non-refundable 
                once submitted to the respective agency, as we have no control over funds transferred to government entities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">5. How to Request a Refund</h2>
              <p className="text-muted-foreground leading-relaxed">To request a refund:</p>
              <ol className="list-decimal pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Email us at refunds@ipsentinel.app with "Refund Request" in the subject line</li>
                <li>Include your account email and the transaction/payment ID</li>
                <li>Provide a detailed explanation of the reason for your refund request</li>
                <li>Include any relevant screenshots or documentation</li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-2">
                We aim to respond to all refund requests within 3-5 business days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">6. Refund Processing</h2>
              <p className="text-muted-foreground leading-relaxed">
                Approved refunds will be processed using the original payment method:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Credit/Debit Card:</strong> 5-10 business days to appear on your statement</li>
                <li><strong>Bank Transfer:</strong> 5-7 business days</li>
                <li><strong>Other Methods:</strong> Processing time varies by provider</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">7. Subscription Cancellations</h2>
              <p className="text-muted-foreground leading-relaxed">
                For subscription services:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>You may cancel at any time from your account settings</li>
                <li>Access continues until the end of the current billing period</li>
                <li>No refunds for partial months unless service was unavailable</li>
                <li>Annual subscriptions may be eligible for pro-rated refunds if canceled within 30 days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">8. Disputes</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you believe your refund request was incorrectly denied, you may appeal by:
              </p>
              <ol className="list-decimal pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Replying to the refund decision email with additional information</li>
                <li>Contacting our customer support team for escalation</li>
                <li>If unresolved, you may dispute the charge with your payment provider</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">9. Service Credits</h2>
              <p className="text-muted-foreground leading-relaxed">
                In some cases, we may offer service credits instead of monetary refunds. Service credits:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Can be applied to future purchases</li>
                <li>Do not expire for 12 months from date of issue</li>
                <li>Are non-transferable</li>
                <li>Cannot be redeemed for cash</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">10. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify this Refund Policy at any time. Changes will be effective 
                immediately upon posting to this page. The refund policy in effect at the time of your 
                purchase will apply to that transaction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about this Refund Policy or to request a refund:
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Email:</strong> refunds@ipsentinel.app<br />
                <strong>Support:</strong> support@ipsentinel.app<br />
                <strong>Response Time:</strong> 3-5 business days
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RefundPolicy;
