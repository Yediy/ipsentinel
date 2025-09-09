import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, Globe, Users, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import SpaceBackground from "@/components/SpaceBackground";

const Index = () => {
  return (
    <div className="min-h-screen bg-transparent relative">
      {/* Hero Section */}
      <section className="legal-section gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent"></div>
        </div>
        <div className="legal-container relative z-10">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex items-center space-x-2">
                <Shield className="h-10 w-10 text-white" />
                <span className="text-3xl font-bold text-white">IPSentinel</span>
              </div>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Protect Your Ideas.<br />
              <span className="text-primary-light">Instantly.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl mb-8 text-primary-light max-w-3xl mx-auto">
              AI-powered patent, trademark & copyright filing. No lawyers needed. 
              File in USA, Canada, EU & WIPO regions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/dashboard">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-primary-light hover:text-white text-lg px-8 py-4 shadow-hero">
                  Start Filing Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-primary text-lg px-8 py-4">
                How It Works
              </Button>
            </div>
            
            <div className="text-primary-light">
              <p className="text-sm">✓ File in minutes, not months  ✓ $49-$199 flat fees  ✓ AI-powered legal drafting</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="legal-section">
        <div className="legal-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-legal-dark mb-6">
              Your Idea Deserves Protection
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Finally, IP law for the people. No gatekeeping, no $500/hour attorneys, no months of waiting.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="shadow-feature border-0 gradient-feature">
              <CardContent className="p-8 text-center">
                <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-4">AI-Powered Drafting</h3>
                <p className="text-muted-foreground">
                  Our AI generates patent claims, trademark applications, and copyright filings in USPTO-compliant format.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-feature border-0 gradient-feature">
              <CardContent className="p-8 text-center">
                <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-4">Global Filing</h3>
                <p className="text-muted-foreground">
                  File in USA, Canada, European Union, and WIPO regions. Protect your IP worldwide with one platform.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-feature border-0 gradient-feature">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-4">Smart Guidance</h3>
                <p className="text-muted-foreground">
                  Answer simple questions. Our AI determines if you need a patent, trademark, copyright, or combination.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="legal-section bg-card">
        <div className="legal-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-legal-dark mb-6">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Three simple steps to protect your intellectual property
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold mb-4">Answer Simple Questions</h3>
              <p className="text-muted-foreground">
                Our smart wizard asks about your creation and determines the best protection strategy.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold mb-4">AI Generates Documents</h3>
              <p className="text-muted-foreground">
                Our AI creates USPTO-compliant patent claims, trademark applications, or copyright filings.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold mb-4">We File & Track</h3>
              <p className="text-muted-foreground">
                We submit your application and provide real-time status updates until approval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="legal-section bg-muted">
        <div className="legal-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-legal-dark mb-6">
              Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              No hidden fees. No hourly rates. Just flat, fair pricing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-card">
              <CardContent className="p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Basic Filing</h3>
                  <div className="text-4xl font-bold text-primary mb-4">$49</div>
                  <p className="text-muted-foreground mb-6">+ Government fees</p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      AI-generated filing
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      USPTO compliance check
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      Email support
                    </li>
                  </ul>
                  <Button className="w-full">Choose Basic</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-primary">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium mb-4 inline-block">
                    Most Popular
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Pro Filing</h3>
                  <div className="text-4xl font-bold text-primary mb-4">$129</div>
                  <p className="text-muted-foreground mb-6">+ Government fees</p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      Everything in Basic
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      Attorney review
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      Priority filing
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      IP monitoring
                    </li>
                  </ul>
                  <Button className="w-full">Choose Pro</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                  <div className="text-4xl font-bold text-primary mb-4">$199</div>
                  <p className="text-muted-foreground mb-6">+ Government fees</p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      Everything in Pro
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      Multiple IP types
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      Global filing
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-success mr-2" />
                      Dedicated support
                    </li>
                  </ul>
                  <Button className="w-full">Choose Enterprise</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="legal-section gradient-hero text-primary-foreground">
        <div className="legal-container text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Ready to Protect Your Ideas?
          </h2>
          <p className="text-xl mb-8 text-primary-light max-w-2xl mx-auto">
            Join thousands of creators, inventors, and entrepreneurs who trust IPSentinel with their intellectual property.
          </p>
          <Link to="/dashboard">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-primary-light hover:text-white text-lg px-8 py-4 shadow-hero">
              Start Your First Filing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Legal Footer */}
      <footer className="bg-legal-dark text-white py-12">
        <div className="legal-container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-6 w-6" />
                <span className="text-lg font-bold">IPSentinel</span>
              </div>
              <p className="text-sm text-gray-300">
                AI-powered intellectual property protection for creators worldwide.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Patent Filing</li>
                <li>Trademark Registration</li>
                <li>Copyright Protection</li>
                <li>IP Monitoring</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Regions</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>United States</li>
                <li>Canada</li>
                <li>European Union</li>
                <li>WIPO Global</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Legal Resources</li>
                <li>API Documentation</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-600 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm text-gray-300">
                © 2024 IPSentinel. All rights reserved.
              </div>
              <div className="flex space-x-6 text-sm text-gray-300">
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms of Service</a>
                <a href="#" className="hover:text-white">Legal Disclaimer</a>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              <p>
                <strong>Legal Disclaimer:</strong> IPSentinel is an AI-assisted tool and is not a law firm. 
                It does not offer legal advice. Use of this platform does not constitute an attorney-client relationship. 
                All filings are performed with user input and guidance. For legal concerns, users may request a licensed attorney review.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;