import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InternationalDashboard } from "@/components/dashboard/InternationalDashboard";
import { Shield, Plus, FileText, Clock, CheckCircle, AlertCircle, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const filings = [
    { id: 1, type: "Patent", title: "Smart Home Security System", status: "approved", date: "2024-01-15", region: "USA" },
    { id: 2, type: "Trademark", title: "TechGuard", status: "pending", date: "2024-01-20", region: "USA" },
    { id: 3, type: "Copyright", title: "Mobile App Source Code", status: "processing", date: "2024-01-25", region: "USA" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'processing':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="legal-container">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-legal-dark">IPSentinel</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/international-filing">
                <Button variant="outline">
                  <Globe className="h-4 w-4 mr-2" />
                  International Filing
                </Button>
              </Link>
              <Button variant="outline">Settings</Button>
              <Button variant="outline">Support</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="legal-container py-8">
        <InternationalDashboard />

      </div>
    </div>
  );
};

export default Dashboard;