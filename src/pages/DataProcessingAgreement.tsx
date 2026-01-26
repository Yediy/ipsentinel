import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, FileText, Globe, Lock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

const DataProcessingAgreement = () => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <Link to="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Data Processing Agreement</h1>
                <p className="text-muted-foreground">GDPR Compliant Data Processing Terms</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Last updated: {currentDate}</p>
          </div>

          {/* Introduction */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed">
                This Data Processing Agreement ("DPA") forms part of the Terms of Service between 
                IP Sentinel ("Processor", "we", "us") and the user ("Controller", "you") for the 
                provision of intellectual property filing services.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                This DPA applies to the processing of personal data by IP Sentinel on behalf of 
                users in connection with the Services, where such processing is subject to the 
                European Union General Data Protection Regulation (GDPR), the UK GDPR, or other 
                applicable data protection laws.
              </p>
            </CardContent>
          </Card>

          {/* Definitions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>1. Definitions</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>"Personal Data"</strong> means any information relating to an identified or identifiable natural person.</li>
                <li><strong>"Processing"</strong> means any operation performed on Personal Data, including collection, storage, use, disclosure, and deletion.</li>
                <li><strong>"Data Subject"</strong> means the individual to whom Personal Data relates.</li>
                <li><strong>"Sub-processor"</strong> means any third party engaged by the Processor to process Personal Data on behalf of the Controller.</li>
                <li><strong>"Supervisory Authority"</strong> means an independent public authority responsible for monitoring the application of data protection law.</li>
                <li><strong>"Security Incident"</strong> means any unauthorized access to, or acquisition, use, or disclosure of Personal Data.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Scope and Purpose */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                2. Scope and Purpose of Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Processor shall process Personal Data only for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Providing intellectual property filing services (patent, trademark, and copyright applications)</li>
                <li>Processing payments and maintaining transaction records</li>
                <li>Sending service-related communications and notifications</li>
                <li>Maintaining user accounts and preferences</li>
                <li>Complying with legal obligations related to IP filings</li>
                <li>Generating and storing filing documents and associated metadata</li>
              </ul>

              <h4 className="font-semibold mt-6 mb-2 text-foreground">Categories of Data Subjects:</h4>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Users of the IP Sentinel platform</li>
                <li>Inventors named in patent applications</li>
                <li>Trademark applicants and owners</li>
                <li>Copyright authors and claimants</li>
              </ul>

              <h4 className="font-semibold mt-6 mb-2 text-foreground">Types of Personal Data Processed:</h4>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Contact information (name, email, address, phone)</li>
                <li>Account credentials and authentication data</li>
                <li>Payment information (processed via Stripe)</li>
                <li>Invention and creative work descriptions</li>
                <li>Filing history and deadline information</li>
                <li>Communication records and preferences</li>
              </ul>
            </CardContent>
          </Card>

          {/* Obligations of the Processor */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                3. Obligations of the Processor
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Processor agrees to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-3">
                <li>
                  <strong>Process Data Only as Instructed:</strong> Process Personal Data only on documented 
                  instructions from the Controller, unless required by applicable law.
                </li>
                <li>
                  <strong>Confidentiality:</strong> Ensure that persons authorized to process Personal Data 
                  have committed to confidentiality or are under statutory obligation of confidentiality.
                </li>
                <li>
                  <strong>Security Measures:</strong> Implement appropriate technical and organizational 
                  measures to ensure security of processing, including encryption, access controls, and 
                  regular security assessments.
                </li>
                <li>
                  <strong>Sub-processing:</strong> Not engage another processor without prior specific or 
                  general written authorization of the Controller. Current sub-processors are listed in 
                  Section 5.
                </li>
                <li>
                  <strong>Assistance with Data Subject Rights:</strong> Assist the Controller in responding 
                  to requests from Data Subjects exercising their rights under applicable data protection laws.
                </li>
                <li>
                  <strong>Data Breach Notification:</strong> Notify the Controller without undue delay 
                  (within 72 hours) after becoming aware of a Security Incident affecting Personal Data.
                </li>
                <li>
                  <strong>Deletion and Return:</strong> At the Controller's choice, delete or return all 
                  Personal Data at the end of the service relationship, unless retention is required by law.
                </li>
                <li>
                  <strong>Audit Rights:</strong> Make available information necessary to demonstrate 
                  compliance and allow for audits conducted by the Controller or an authorized auditor.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Security Measures */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>4. Technical and Organizational Security Measures</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Processor implements the following security measures:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 text-foreground">Access Controls</h4>
                  <ul className="list-disc pl-4 text-muted-foreground text-sm space-y-1">
                    <li>Role-based access control (RBAC)</li>
                    <li>Multi-factor authentication available</li>
                    <li>Row-level security policies</li>
                    <li>Audit logging of all access</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 text-foreground">Encryption</h4>
                  <ul className="list-disc pl-4 text-muted-foreground text-sm space-y-1">
                    <li>TLS 1.2+ for data in transit</li>
                    <li>AES-256 encryption at rest</li>
                    <li>Encrypted database connections</li>
                    <li>Secure key management</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 text-foreground">Infrastructure</h4>
                  <ul className="list-disc pl-4 text-muted-foreground text-sm space-y-1">
                    <li>Cloud hosting with SOC 2 compliance</li>
                    <li>Automated backups</li>
                    <li>DDoS protection</li>
                    <li>Network isolation</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 text-foreground">Monitoring</h4>
                  <ul className="list-disc pl-4 text-muted-foreground text-sm space-y-1">
                    <li>24/7 security monitoring</li>
                    <li>Intrusion detection systems</li>
                    <li>Regular vulnerability scanning</li>
                    <li>Incident response procedures</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-processors */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                5. Authorized Sub-processors
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Controller authorizes the use of the following sub-processors:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-2 text-left">Sub-processor</th>
                      <th className="border border-border p-2 text-left">Purpose</th>
                      <th className="border border-border p-2 text-left">Location</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr>
                      <td className="border border-border p-2">Supabase Inc.</td>
                      <td className="border border-border p-2">Database hosting, authentication, storage</td>
                      <td className="border border-border p-2">USA (AWS)</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-2">Stripe, Inc.</td>
                      <td className="border border-border p-2">Payment processing</td>
                      <td className="border border-border p-2">USA</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-2">Postmark (Wildbit)</td>
                      <td className="border border-border p-2">Transactional email delivery</td>
                      <td className="border border-border p-2">USA</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-2">OpenAI</td>
                      <td className="border border-border p-2">AI-assisted document generation</td>
                      <td className="border border-border p-2">USA</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-2">PostHog</td>
                      <td className="border border-border p-2">Analytics (with consent)</td>
                      <td className="border border-border p-2">USA/EU</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm mt-4">
                The Processor will notify the Controller of any intended changes to sub-processors, 
                giving the Controller the opportunity to object to such changes.
              </p>
            </CardContent>
          </Card>

          {/* International Transfers */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>6. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed">
                Personal Data may be transferred to and processed in countries outside the European 
                Economic Area (EEA). Where such transfers occur, the Processor ensures appropriate 
                safeguards are in place, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                <li>Data Processing Agreements with sub-processors that include equivalent protections</li>
                <li>Additional technical measures such as encryption and pseudonymization where appropriate</li>
                <li>Transfer Impact Assessments for high-risk transfers</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Subject Rights */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>7. Data Subject Rights</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Processor will assist the Controller in fulfilling Data Subject requests including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Right of Access:</strong> Obtaining confirmation and copies of Personal Data</li>
                <li><strong>Right to Rectification:</strong> Correcting inaccurate Personal Data</li>
                <li><strong>Right to Erasure:</strong> Deleting Personal Data ("right to be forgotten")</li>
                <li><strong>Right to Restriction:</strong> Limiting the processing of Personal Data</li>
                <li><strong>Right to Data Portability:</strong> Receiving Personal Data in a structured format</li>
                <li><strong>Right to Object:</strong> Objecting to processing based on legitimate interests</li>
              </ul>
              <p className="text-muted-foreground text-sm mt-4">
                Requests can be submitted to: <a href="mailto:privacy@ipsentinel.app" className="text-primary hover:underline">privacy@ipsentinel.app</a>
              </p>
            </CardContent>
          </Card>

          {/* Term and Termination */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>8. Term and Termination</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed">
                This DPA shall remain in effect for the duration of the processing of Personal Data 
                by the Processor. Upon termination of the Services:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                <li>The Processor shall cease all processing of Personal Data</li>
                <li>At the Controller's election, delete or return all Personal Data within 30 days</li>
                <li>Provide certification of deletion upon request</li>
                <li>Retain only data required by applicable law, with appropriate safeguards</li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>9. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-muted-foreground leading-relaxed">
                For questions about this DPA or to exercise data protection rights:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm"><strong>Data Protection Contact:</strong></p>
                <p className="text-sm text-muted-foreground">Email: privacy@ipsentinel.app</p>
                <p className="text-sm text-muted-foreground mt-2">
                  IP Sentinel<br />
                  Data Protection Office<br />
                  [Address to be provided]
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Link to="/privacy">
              <Button variant="outline">View Privacy Policy</Button>
            </Link>
            <Link to="/terms">
              <Button variant="outline">View Terms of Service</Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DataProcessingAgreement;
