"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface DBStatus {
  status: string;
  message: string;
  user?: {
    user_id: string;
    email: string;
    name: string;
    plan: string;
    created_at: string;
  };
  migration?: string;
  instructions?: string[];
  error?: string;
}

export default function DBDiagnosticsPage() {
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);

  async function checkDB() {
    setLoading(true);
    setUpdateResult(null);
    try {
      const res = await fetch("/api/admin/check-db");
      const data = await res.json();
      setDbStatus(data);
    } catch (error) {
      console.error("Error checking DB:", error);
      setDbStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function updatePlan(plan: string) {
    setUpdating(true);
    setUpdateResult(null);
    try {
      const res = await fetch("/api/admin/update-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (res.ok) {
        setUpdateResult(`✅ Success! Plan updated to ${plan}`);
        // Refresh DB status
        await checkDB();
      } else {
        setUpdateResult(`❌ Error: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error("Error updating plan:", error);
      setUpdateResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUpdating(false);
    }
  }

  useEffect(() => {
    checkDB();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <p className="text-slate-400">Checking database...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Database Diagnostics</h1>
        <p className="text-slate-400 mb-8">Check and fix subscription plan issues</p>

        {/* Status Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <div className="flex items-start gap-4">
            {dbStatus?.status === "ok" && (
              <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
            )}
            {dbStatus?.status === "migration_needed" && (
              <AlertCircle className="w-8 h-8 text-yellow-400 flex-shrink-0" />
            )}
            {dbStatus?.status === "user_not_found" && (
              <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
            )}
            {dbStatus?.status === "error" && (
              <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
            )}

            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">
                {dbStatus?.status === "ok" && "✅ Database OK"}
                {dbStatus?.status === "migration_needed" && "⚠️ Migration Required"}
                {dbStatus?.status === "user_not_found" && "❌ User Not Found"}
                {dbStatus?.status === "error" && "❌ Error"}
              </h2>
              <p className="text-slate-300">{dbStatus?.message}</p>

              {dbStatus?.error && (
                <div className="mt-4 p-3 rounded-lg bg-red-950/30 border border-red-500/30">
                  <p className="text-sm text-red-300 font-mono">{dbStatus.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Migration Instructions */}
        {dbStatus?.status === "migration_needed" && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/20 p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-200 mb-3">
              Migration Required
            </h3>
            <p className="text-yellow-100/80 mb-4">
              Follow these steps to add the plan column to your database:
            </p>
            <ol className="space-y-2 mb-4">
              {dbStatus.instructions?.map((instruction, idx) => (
                <li key={idx} className="text-yellow-100/90">
                  {instruction}
                </li>
              ))}
            </ol>
            <div className="p-4 rounded-lg bg-black/40 border border-yellow-500/20">
              <p className="text-xs text-yellow-300 mb-2 font-semibold">
                Migration File: {dbStatus.migration}
              </p>
              <pre className="text-xs text-slate-300 overflow-x-auto">
{`-- Add plan column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free', 'Basic', 'Unlimited'));

-- Create index for plan lookups
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);`}
              </pre>
            </div>
            <Button
              onClick={checkDB}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700"
            >
              Re-check After Migration
            </Button>
          </div>
        )}

        {/* User Info */}
        {dbStatus?.user && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Current User Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono text-sm">{dbStatus.user.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span>{dbStatus.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span>{dbStatus.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Plan:</span>
                <span className="font-bold text-blue-300">{dbStatus.user.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Member Since:</span>
                <span>{new Date(dbStatus.user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Manual Plan Update */}
        {dbStatus?.status === "ok" && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-6">
            <h3 className="text-lg font-semibold text-blue-200 mb-3">
              Update Plan Manually
            </h3>
            <p className="text-blue-100/80 mb-4">
              If your plan is incorrect, you can manually update it here:
            </p>

            <div className="flex gap-3 mb-4">
              <Button
                onClick={() => updatePlan("Free")}
                disabled={updating || dbStatus.user?.plan === "Free"}
                variant="outline"
                className="border-slate-500/50"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Free
              </Button>
              <Button
                onClick={() => updatePlan("Basic")}
                disabled={updating || dbStatus.user?.plan === "Basic"}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Basic
              </Button>
              <Button
                onClick={() => updatePlan("Unlimited")}
                disabled={updating || dbStatus.user?.plan === "Unlimited"}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Unlimited
              </Button>
            </div>

            {updateResult && (
              <div className={`p-3 rounded-lg ${
                updateResult.startsWith("✅")
                  ? "bg-green-950/30 border border-green-500/30"
                  : "bg-red-950/30 border border-red-500/30"
              }`}>
                <p className={`text-sm ${
                  updateResult.startsWith("✅") ? "text-green-300" : "text-red-300"
                }`}>
                  {updateResult}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button onClick={checkDB} variant="outline">
            Refresh Status
          </Button>
          <Button
            onClick={() => window.location.href = "/dashboard/billing"}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Go to Billing Page
          </Button>
        </div>
      </div>
    </div>
  );
}
