import { Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AdminBanner() {
  return (
    <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950/20">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
        <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
          <span className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">ADMIN MODE</span>
            You have elevated privileges. Changes you make affect all users.
          </span>
        </AlertDescription>
      </div>
    </Alert>
  );
}
