import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Brain, Clock, CheckCircle, Star, Users, Award, User, LogIn, UserPlus, Zap, Globe, FileImage } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

const Index = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      // Check admin status using RPC
      if (session?.user) {
        const { data } = await supabase
          .rpc('has_role', { 
            _user_id: session.user.id, 
            _role: 'admin' 
          });
        console.info('[Index] Admin check result:', data);
        setIsAdmin(!!data);
      }
      
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data } = await supabase
          .rpc('has_role', { 
            _user_id: session.user.id, 
            _role: 'admin' 
          });
        console.info('[Index authStateChange] Admin check result:', data);
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const AuthenticatedHeader = () => (
    <div className="text-center space-y-4 mb-12">
      <div className="flex flex-col items-center gap-3 mb-4">
        <div className="inline-flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
          <User className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">Welcome back, {user?.email}</span>
        </div>
        {isAdmin && (
          <Link to="/admin">
            <Button 
              size="lg" 
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse border-2 border-red-400"
            >
              <Shield className="mr-2 h-5 w-5" />
              Admin Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>
      <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight text-white">
        Ready to Protect Your IP?
      </h1>
      <p className="text-xl lg:text-2xl mb-8 text-primary-light max-w-3xl mx-auto">
        Continue managing your intellectual property filings with AI-powered assistance.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <Link to="/dashboard">
          <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-primary-light hover:text-white text-lg px-8 py-4 shadow-hero">
            <Shield className="mr-2 h-5 w-5" />
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
        <Link to="/provisional">
          <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-primary text-lg px-8 py-4">
            <Zap className="mr-2 h-5 w-5" />
            Provisional Patent
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
        <Link to="/drawings-demo">
          <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-primary text-lg px-8 py-4">
            <FileImage className="mr-2 h-5 w-5" />
            Patent Drawings
          </Button>
        </Link>
      </div>
    </div>
  );

  const UnauthenticatedHeader = () => (
    <div className="text-center space-y-4 mb-12">
      <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
        File Patents, Trademarks & Copyrights in Minutes<br />
        <span className="text-primary-light">— Without a Lawyer</span>
      </h1>
      
      <p className="text-xl lg:text-2xl mb-8 text-primary-light max-w-3xl mx-auto">
        AI-powered IP filing for inventors, creators, and entrepreneurs.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
        <Link to="/auth">
          <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-primary-light hover:text-white text-lg px-8 py-4 shadow-hero">
            <UserPlus className="mr-2 h-5 w-5" />
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
        <Link to="/auth">
          <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-primary text-lg px-8 py-4">
            <LogIn className="mr-2 h-5 w-5" />
            Sign In
          </Button>
        </Link>
      </div>
      
      <div className="text-primary-light">
        <p className="text-sm">✓ File in minutes, not months  ✓ $49-$199 flat fees  ✓ AI-powered legal drafting</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            
            {/* Conditional Header based on authentication status */}
            {user ? <AuthenticatedHeader /> : <UnauthenticatedHeader />}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="legal-section bg-background">
        <div className="legal-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose IPSentinel?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional-grade IP protection with the speed and affordability of AI automation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="legal-card">
              <CardContent className="legal-card-content">
                <div className="bg-primary/10 rounded-full p-3 w-fit mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Drafting</h3>
                <p className="text-muted-foreground">
                  Our AI analyzes your invention and creates professional patent applications that meet USPTO standards.
                </p>
              </CardContent>
            </Card>
            
            <Card className="legal-card">
              <CardContent className="legal-card-content">
                <div className="bg-primary/10 rounded-full p-3 w-fit mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">File in Minutes</h3>
                <p className="text-muted-foreground">
                  Complete your filing in under 30 minutes. No more waiting weeks or months for attorney drafts.
                </p>
              </CardContent>
            </Card>
            
            <Card className="legal-card">
              <CardContent className="legal-card-content">
                <div className="bg-primary/10 rounded-full p-3 w-fit mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Expert Review</h3>
                <p className="text-muted-foreground">
                  All applications are reviewed by licensed patent attorneys before filing with the USPTO. <span className="text-sm italic">If requested, will prolong filing by 24-48 hours.</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="legal-section bg-muted/30">
        <div className="legal-container">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">15,000+</div>
              <div className="text-muted-foreground">Applications Filed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Client Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">30 min</div>
              <div className="text-muted-foreground">Average Filing Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">AI Assistant Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="legal-section bg-background">
        <div className="legal-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive intellectual property protection for all your innovations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="legal-card hover:shadow-xl transition-shadow">
              <CardContent className="legal-card-content text-center">
                <div className="bg-blue-100 rounded-full p-4 w-fit mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Patents</h3>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Utility Patents</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Design Patents</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Provisional Applications</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />PCT Filings</li>
                </ul>
                <div className="text-2xl font-bold text-primary mb-2">$199</div>
                <div className="text-sm text-muted-foreground mb-4">+ USPTO fees</div>
                 {user ? (
                   <div className="flex gap-2">
                     <Button asChild className="w-full">
                       <Link to="/filing/wizard">Start Patent Filing</Link>
                     </Button>
                     <Button asChild variant="outline" size="sm">
                       <Link to="/cost-calculator">Cost Calculator</Link>
                     </Button>
                   </div>
                 ) : (
                   <Button asChild className="w-full">
                     <Link to="/auth">Get Started</Link>
                   </Button>
                 )}
              </CardContent>
            </Card>
            
            <Card className="legal-card hover:shadow-xl transition-shadow">
              <CardContent className="legal-card-content text-center">
                <div className="bg-green-100 rounded-full p-4 w-fit mx-auto mb-4">
                  <Award className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Trademarks</h3>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Word Marks</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Design Marks</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Clearance Search</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Madrid Protocol</li>
                </ul>
                <div className="text-2xl font-bold text-primary mb-2">$99</div>
                <div className="text-sm text-muted-foreground mb-4">+ USPTO fees</div>
                {user ? (
                  <div className="flex gap-2">
                    <Button asChild className="w-full">
                      <Link to="/filing/wizard">File Trademark</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/trademark-status">Check Status</Link>
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/auth">Get Started</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
            
            <Card className="legal-card hover:shadow-xl transition-shadow">
              <CardContent className="legal-card-content text-center">
                <div className="bg-purple-100 rounded-full p-4 w-fit mx-auto mb-4">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Copyrights</h3>
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Literary Works</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Software Code</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Artistic Works</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Music & Audio</li>
                </ul>
                <div className="text-2xl font-bold text-primary mb-2">$49</div>
                <div className="text-sm text-muted-foreground mb-4">+ USCO fees</div>
                {user ? (
                  <Button asChild className="w-full">
                    <Link to="/filing/wizard">Register Copyright</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/auth">Get Started</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="legal-section bg-primary text-primary-foreground">
        <div className="legal-container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Protect Your Ideas?</h2>
          <p className="text-xl mb-8 text-primary-light max-w-2xl mx-auto">
            Join thousands of inventors and creators who trust IPSentinel with their intellectual property.
          </p>
          {user ? (
            <div className="space-y-4">
              <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-primary-light hover:text-white">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-primary-light hover:text-white">
                <Link to="/auth">Get Started Today</Link>
              </Button>
              <div>
                <p className="text-sm text-primary-light">
                  ✓ No credit card required  ✓ Free consultation  ✓ 30-day money-back guarantee
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;