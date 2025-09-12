import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import SpaceBackground from "./components/SpaceBackground";
import { AppSidebar } from "./components/AppSidebar";
import { AuthGuard } from "./components/AuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import FilingsDashboard from "./pages/FilingsDashboard";
import FilingWizard from "./pages/FilingWizard";
import CostCalculator from "./pages/CostCalculator";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import NotFound from "./pages/NotFound";
import { PatentFilingDashboard } from "./components/patent/PatentFilingDashboard";

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
            <Route path="/patent-filing" element={<PatentFilingDashboard />} />
            
            {/* Protected Routes with Sidebar */}
            <Route path="/dashboard" element={
              <AuthGuard>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <main className="flex-1 p-6 bg-background">
                      <EnhancedDashboard />
                    </main>
                  </div>
                </SidebarProvider>
              </AuthGuard>
            } />
            
            <Route path="/filings" element={
              <AuthGuard>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <main className="flex-1 p-6 bg-background">
                      <FilingsDashboard />
                    </main>
                  </div>
                </SidebarProvider>
              </AuthGuard>
            } />
            
            <Route path="/filing/wizard" element={
              <AuthGuard>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <main className="flex-1 p-6 bg-background">
                      <FilingWizard />
                    </main>
                  </div>
                </SidebarProvider>
              </AuthGuard>
            } />

            <Route path="/cost-calculator" element={
              <AuthGuard>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <main className="flex-1 p-6 bg-background">
                      <CostCalculator />
                    </main>
                  </div>
                </SidebarProvider>
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
