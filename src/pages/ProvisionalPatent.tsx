import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProvisionalPatentWizard } from "@/components/patent/provisional";
import { StatusView } from "@/components/patent/provisional/StatusView";
import { DownloadCenter } from "@/components/patent/provisional/DownloadCenter";
import { useIntakeApi, type IntakeStatus } from "@/hooks/useIntakeApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ProvisionalPatent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intakeApi = useIntakeApi();

  const [loading, setLoading] = useState(true);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Load or create intake
  useEffect(() => {
    loadIntake();
  }, []);

  const loadIntake = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Check for existing non-deleted intake
      const { data: intakes } = await supabase
        .from("intakes")
        .select("id, status")
        .eq("user_id", user.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(1);

      if (intakes && intakes.length > 0) {
        setIntakeId(intakes[0].id);
        setIntakeStatus(intakes[0].status as IntakeStatus);
      } else {
        // No existing intake — wizard will create one on first save
        setIntakeId(null);
        setIntakeStatus("draft");
      }
    } catch {
      toast.error("Failed to load intake");
    } finally {
      setLoading(false);
    }
  };

  // Poll for status updates when generating/paid
  useEffect(() => {
    if (!intakeId || !["paid", "generating"].includes(intakeStatus || "")) return;

    const interval = setInterval(async () => {
      try {
        const res = await intakeApi.getIntakeStatus(intakeId);
        if (res.status !== intakeStatus) {
          setIntakeStatus(res.status as IntakeStatus);
          if (res.status === "ready") {
            toast.success("Your patent draft is ready!");
          }
        }
      } catch { /* ignore polling errors */ }
    }, 5000);

    return () => clearInterval(interval);
  }, [intakeId, intakeStatus, intakeApi]);

  const handleRetry = async () => {
    if (!intakeId) return;
    setRetrying(true);
    try {
      const result = await intakeApi.retryGeneration(intakeId);
      setIntakeStatus(result.status);
    } catch { /* toast handled in hook */ }
    finally { setRetrying(false); }
  };

  const handleDeleteNow = async () => {
    if (!intakeId) return;
    try {
      await intakeApi.deleteIntake(intakeId);
      setIntakeStatus("deleted");
    } catch { /* toast handled in hook */ }
  };

  const handleRestart = () => {
    setIntakeId(null);
    setIntakeStatus("draft");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Wizard view (draft or no intake yet)
  if (intakeStatus === "draft" || !intakeStatus) {
    return (
      <ProvisionalPatentWizard
        filingId={undefined}
        onComplete={() => loadIntake()}
      />
    );
  }

  // All other statuses
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Provisional Patent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Status: <Badge variant="outline" className="ml-1">{intakeStatus}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            72h retention
          </Badge>
          {intakeStatus !== "deleted" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all data now?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your answers and all generated documents. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteNow} className="bg-destructive text-destructive-foreground">
                    Delete Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Status-specific view */}
      <StatusView
        status={intakeStatus}
        onRetry={handleRetry}
        onRestart={handleRestart}
        retrying={retrying}
        onPay={() => {
          // Re-enter the wizard at payment view — reload with ready_for_payment
          // The wizard handles payment flow internally
          setIntakeStatus("draft");
        }}
      />

      {/* Download Center (only when ready) */}
      {intakeStatus === "ready" && intakeId && (
        <DownloadCenter intakeId={intakeId} />
      )}

      {/* Retention notice */}
      {intakeStatus !== "deleted" && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-2">Data Retention Notice</h4>
            <p className="text-xs text-muted-foreground">
              All inputs and generated documents are automatically deleted 72 hours after creation.
              You can delete immediately using the trash icon above.
              Payment records are retained for accounting purposes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProvisionalPatent;
