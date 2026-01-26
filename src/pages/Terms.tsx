import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Terms = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last updated: January 26, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using IP Sentinel ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all visitors, 
                users, and others who access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                IP Sentinel provides an online platform that assists users in preparing, organizing, and managing 
                intellectual property filings, including patents, trademarks, and copyrights. The Service includes 
                document generation tools, deadline tracking, and filing management features.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                <strong>Important:</strong> IP Sentinel is a software tool and does not provide legal advice. 
                The Service is not a law firm and does not replace the advice of a qualified intellectual property 
                attorney. Users are responsible for ensuring the accuracy and completeness of their filings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">3. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed">
                To use certain features of the Service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li>Providing accurate, current, and complete information during registration</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">4. Intellectual Property Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are owned by IP Sentinel and are 
                protected by international copyright, trademark, patent, trade secret, and other intellectual property 
                laws. You retain all rights to the content you submit through the Service, including your filing data, 
                documents, and other materials.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">5. User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed">You agree to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                <li>Not use the Service to infringe upon the intellectual property rights of others</li>
                <li>Provide accurate and truthful information in all filings</li>
                <li>Not attempt to gain unauthorized access to any portion of the Service</li>
                <li>Not interfere with or disrupt the Service or servers connected to the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">6. Payment Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                Certain features of the Service require payment. By using paid features, you agree to pay all 
                applicable fees. Payments are processed through our third-party payment processor (Stripe). 
                All fees are exclusive of taxes, which may be added where applicable. Payment obligations are 
                non-cancelable and fees paid are non-refundable except as expressly set forth in our Refund Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">7. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE. 
                WE DO NOT GUARANTEE ANY SPECIFIC OUTCOMES FROM THE USE OF THE SERVICE, INCLUDING THE APPROVAL OF ANY 
                INTELLECTUAL PROPERTY APPLICATIONS.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                IN NO EVENT SHALL IP SENTINEL, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES 
                BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
                WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING 
                FROM YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">9. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to defend, indemnify, and hold harmless IP Sentinel and its licensees and licensors, 
                and their employees, contractors, agents, officers, and directors, from and against any and all 
                claims, damages, obligations, losses, liabilities, costs or debt, and expenses arising from your 
                use of and access to the Service or your violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, 
                we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes 
                a material change will be determined at our sole discretion. By continuing to access or use 
                the Service after revisions become effective, you agree to be bound by the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">11. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed and construed in accordance with the laws of the United States, 
                without regard to its conflict of law provisions. Our failure to enforce any right or provision 
                of these Terms will not be considered a waiver of those rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-6 mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms, please contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Email:</strong> legal@ipsentinel.app<br />
                <strong>Address:</strong> IP Sentinel Legal Department
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Terms;
