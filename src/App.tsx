import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import SpaceBackground from "./components/SpaceBackground";
import { AppSidebar } from "./components/AppSidebar";
import { AuthGuard } from "./components/AuthGuard";
import { AdminGuard } from "./components/AdminGuard";
import { LegalConsentGate } from "./components/LegalConsentGate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PleaseVerify from "./pages/PleaseVerify";
import Dashboard from "./pages/Dashboard";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import FilingsDashboard from "./pages/FilingsDashboard";
import FilingWizard from "./pages/FilingWizard";
import CostCalculator from "./pages/CostCalculator";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import NotFound from "./pages/NotFound";
import { PatentFilingDashboard } from "./components/patent/PatentFilingDashboard";
import InternationalFiling from "./pages/InternationalFiling";
import DrawingsDemo from "./pages/DrawingsDemo";
import IPGenieWizard from "./pages/IPGenieWizard";
import IPGenieCostCalculator from "./pages/IPGenieCostCalculator";
import AdminDashboard from "./pages/AdminDashboard";
import PriorArtSearch from "./pages/PriorArtSearch";
import TrademarkStatus from "./pages/TrademarkStatus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen relative">
        <SpaceBackground />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/please-verify" element={<PleaseVerify />} />
            <Route path="/patent-filing" element={<PatentFilingDashboard />} />
            <Route path="/international-filing" element={<InternationalFiling />} />
            <Route path="/drawings-demo" element={<DrawingsDemo />} />
            <Route path="/wizard" element={<IPGenieWizard />} />
            <Route path="/calculator" element={<IPGenieCostCalculator />} />
            <Route path="/prior-art" element={<PriorArtSearch />} />
            <Route path="/tm-status" element={<TrademarkStatus />} />
            
            {/* Admin Route - Protected */}
            <Route path="/admin" element={
              <AuthGuard>
                <AdminGuard>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <main className="flex-1 p-6 bg-background">
                        <AdminDashboard />
                      </main>
                    </div>
                  </SidebarProvider>
                </AdminGuard>
              </AuthGuard>
            } />
            
            {/* Protected Routes with Sidebar - Wrapped in AuthGuard and LegalConsentGate */}
            <Route path="/dashboard" element={
              <AuthGuard>
                <LegalConsentGate>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <main className="flex-1 p-6 bg-background">
                        <EnhancedDashboard />
                      </main>
                    </div>
                  </SidebarProvider>
                </LegalConsentGate>
              </AuthGuard>
            } />
            
            <Route path="/filings" element={
              <AuthGuard>
                <LegalConsentGate>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <main className="flex-1 p-6 bg-background">
                        <FilingsDashboard />
                      </main>
                    </div>
                  </SidebarProvider>
                </LegalConsentGate>
              </AuthGuard>
            } />
            
            <Route path="/filing/wizard" element={
              <AuthGuard>
                <LegalConsentGate>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <main className="flex-1 p-6 bg-background">
                        <FilingWizard />
                      </main>
                    </div>
                  </SidebarProvider>
                </LegalConsentGate>
              </AuthGuard>
            } />

            <Route path="/cost-calculator" element={
              <AuthGuard>
                <LegalConsentGate>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <main className="flex-1 p-6 bg-background">
                        <CostCalculator />
                      </main>
                    </div>
                  </SidebarProvider>
                </LegalConsentGate>
              </AuthGuard>
            } />
            
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            
            {/* Legacy route redirect */}
            <Route path="/old-dashboard" element={<Dashboard />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
