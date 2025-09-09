import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
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
              <Button variant="outline">Settings</Button>
              <Button variant="outline">Support</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="legal-container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-legal-dark mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Manage your intellectual property portfolio and start new filings.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link to="/filing/wizard">
            <Card className="shadow-card hover:shadow-feature transition-shadow cursor-pointer border-primary/20 hover:border-primary">
              <CardContent className="p-6 text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Start New Filing</h3>
                <p className="text-sm text-muted-foreground">Patent, Trademark, or Copyright</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <div className="bg-success text-success-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Active Protections</h3>
              <p className="text-2xl font-bold text-success">1</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <div className="bg-warning text-warning-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">In Progress</h3>
              <p className="text-2xl font-bold text-warning">2</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Draft Center</h3>
              <p className="text-2xl font-bold text-primary">0</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Filings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-legal-dark">Recent Filings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filings.map((filing) => (
                <div key={filing.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(filing.status)}
                      <div>
                        <h3 className="font-semibold text-legal-dark">{filing.title}</h3>
                        <p className="text-sm text-muted-foreground">{filing.type} • {filing.region} • {filing.date}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(filing.status)}>
                      {filing.status.charAt(0).toUpperCase() + filing.status.slice(1)}
                    </Badge>
                    <Button variant="ghost" size="sm">View Details</Button>
                  </div>
                </div>
              ))}
            </div>
            
            {filings.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No filings yet</h3>
                <p className="text-muted-foreground mb-4">Start your first IP filing to see it here.</p>
                <Link to="/filing/wizard">
                  <Button>Start First Filing</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;