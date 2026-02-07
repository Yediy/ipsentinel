import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────
export type IntakeStatus =
  | "draft"
  | "ready_for_payment"
  | "paid"
  | "generating"
  | "ready"
  | "failed"
  | "deleted";

export interface IntakeScoreResult {
  score: {
    overall: number;
    breakdown: {
      completeness: number;
      specificity: number;
      embodiments: number;
      clarity: number;
    };
  };
  followups: { id: string; prompt: string }[];
  intake: { id: string; status: IntakeStatus; quality_score: number };
}

export interface IntakeDocument {
  id: string;
  kind: string;
  created_at: string;
}

// ── Hook ───────────────────────────────────────────────────────────────
export function useIntakeApi() {
  const [loading, setLoading] = useState(false);

  const invoke = useCallback(
    async <T = unknown>(fn: string, body: Record<string, unknown>): Promise<T> => {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw new Error(error.message || "API call failed");
      return data as T;
    },
    []
  );

  /** POST /intake-api { action: "create" } */
  const createIntake = useCallback(
    async (wizardVersion = "v1.0") => {
      setLoading(true);
      try {
        const res = await invoke<{ intake: { id: string; status: IntakeStatus } }>(
          "intake-api",
          { action: "create", wizard_version: wizardVersion }
        );
        return res.intake;
      } finally {
        setLoading(false);
      }
    },
    [invoke]
  );

  /** POST /intake-api { action: "autosave" } */
  const autosaveIntake = useCallback(
    async (id: string, answersJson: Record<string, unknown>) => {
      try {
        const res = await invoke<{ intake: { quality_score: number } }>(
          "intake-api",
          { action: "autosave", id, answers_json: answersJson }
        );
        return res.intake;
      } catch {
        // Silently fail for autosave — don't block the user
        return null;
      }
    },
    [invoke]
  );

  /** POST /intake-api { action: "score" } — quality gate */
  const scoreIntake = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        return await invoke<IntakeScoreResult>("intake-api", {
          action: "score",
          id,
        });
      } finally {
        setLoading(false);
      }
    },
    [invoke]
  );

  /** POST /intake-api { action: "status" } — polling */
  const getIntakeStatus = useCallback(
    async (id: string) => {
      const res = await invoke<{
        id: string;
        status: IntakeStatus;
        quality_score: number | null;
      }>("intake-api", { action: "status", id });
      return res;
    },
    [invoke]
  );

  /** POST /intake-api { action: "delete" } */
  const deleteIntake = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        await invoke("intake-api", { action: "delete", id });
        toast.success("Data deleted successfully");
      } catch (err: any) {
        toast.error(err.message || "Delete failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [invoke]
  );

  /** POST /intake-api { action: "retry" } */
  const retryGeneration = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const res = await invoke<{ intake: { id: string; status: IntakeStatus } }>(
          "intake-api",
          { action: "retry", id }
        );
        toast.success("Generation restarted");
        return res.intake;
      } catch (err: any) {
        toast.error(err.message || "Retry failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [invoke]
  );

  /** POST /intake-documents { action: "list" } */
  const listDocuments = useCallback(
    async (intakeId: string) => {
      const res = await invoke<{ documents: IntakeDocument[] }>(
        "intake-documents",
        { action: "list", intake_id: intakeId }
      );
      return res.documents;
    },
    [invoke]
  );

  /** POST /intake-documents { action: "signed-url" } */
  const getSignedUrl = useCallback(
    async (documentId: string) => {
      const res = await invoke<{ url: string }>("intake-documents", {
        action: "signed-url",
        document_id: documentId,
      });
      return res.url;
    },
    [invoke]
  );

  return {
    loading,
    createIntake,
    autosaveIntake,
    scoreIntake,
    getIntakeStatus,
    deleteIntake,
    retryGeneration,
    listDocuments,
    getSignedUrl,
  };
}
