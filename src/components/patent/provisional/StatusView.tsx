import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Loader,
  CreditCard,
  ExternalLink,
  FileText,
} from "lucide-react";
import type { IntakeStatus } from "@/hooks/useIntakeApi";

interface StatusViewProps {
  status: IntakeStatus;
  onRetry?: () => void;
  onRestart?: () => void;
  retrying?: boolean;
  /** Only needed for ready_for_payment → navigates to payment */
  onPay?: () => void;
}

export const StatusView: React.FC<StatusViewProps> = ({
  status,
  onRetry,
  onRestart,
  retrying,
  onPay,
}) => {
  switch (status) {
    case "paid":
      return (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader className="h-12 w-12 mx-auto text-primary animate-spin" />
            <h3 className="text-xl font-semibold">Preparing your documents…</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your payment was received. We're setting up document generation now. This page will update automatically.
            </p>
          </CardContent>
        </Card>
      );

    case "generating":
      return (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
            <h3 className="text-xl font-semibold">Generating Your Patent Draft</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Our AI is creating your provisional patent application. This typically takes 5–10 minutes.
            </p>
            <Badge variant="secondary" className="gap-1">
              <Loader className="h-3 w-3 animate-spin" />
              In progress
            </Badge>
            <p className="text-sm text-muted-foreground mt-4">
              You'll receive an email when it's ready. Feel free to leave this page.
            </p>
          </CardContent>
        </Card>
      );

    case "failed":
      return (
        <Card className="border-destructive/50">
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h3 className="text-xl font-semibold">Generation Failed</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Something went wrong during document generation. You can retry below, or contact support if the issue persists.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={onRetry} disabled={retrying} className="gap-2">
                {retrying ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Retry generation
              </Button>
              <Button variant="outline" asChild>
                <a href="mailto:support@ipsentinel.com">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Contact support
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    case "deleted":
      return (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Trash2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-xl font-semibold">Data Removed</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This intake and its associated documents have been permanently deleted.
            </p>
            <Button onClick={onRestart} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Start a new application
            </Button>
          </CardContent>
        </Card>
      );

    case "ready_for_payment":
      return (
        <Card className="border-primary/50">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Ready to Generate</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your answers passed the quality gate. Complete payment to generate your patent draft.
            </p>
            <Button size="lg" onClick={onPay} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Pay & Generate
            </Button>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
};
