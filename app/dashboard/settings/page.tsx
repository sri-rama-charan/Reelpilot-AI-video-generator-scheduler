"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Youtube, Instagram, AlertTriangle, Loader2, Unlink2, Lock } from "lucide-react";
import { UpgradeDialog } from "@/components/dialogs/UpgradeDialog";
import { Plan } from "@/lib/plans";

type SocialPlatform = "youtube" | "instagram" | "tiktok";

type PlatformStatus = {
  platform: SocialPlatform;
  enabled: boolean;
  missingEnv: string[];
};

type ConnectedAccount = {
  platform: SocialPlatform;
  account_id: string | null;
  account_name: string | null;
  token_expires_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  youtube: "YouTube Channel",
  instagram: "Instagram Account",
  tiktok: "TikTok Account",
};

const PLATFORM_ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: () => <span className="font-semibold text-sm">TT</span>,
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyPlatform, setBusyPlatform] = useState<SocialPlatform | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [userPlan, setUserPlan] = useState<Plan | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const queryStatus = searchParams.get("status");
  const queryMessage = searchParams.get("message");
  const queryPlatform = searchParams.get("platform");

  useEffect(() => {
    if (queryMessage) {
      const formatted = queryPlatform
        ? `${queryPlatform.toUpperCase()}: ${queryMessage}`
        : queryMessage;
      if (queryStatus === "connected") {
        setMessage(formatted);
        setError(null);
      } else {
        setError(formatted);
      }
    }
  }, [queryStatus, queryMessage, queryPlatform]);

  async function loadSettings() {
    try {
      setLoading(true);
      
      // Load social accounts
      const res = await fetch("/api/settings/social-accounts", { cache: "no-store" });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load settings");
      }

      setAccounts(payload.accounts || []);
      setPlatforms(payload.platforms || []);

      // Load user plan
      const userRes = await fetch("/api/user/profile", { cache: "no-store" });
      const userData = await userRes.json();
      if (userRes.ok && userData.plan) {
        setUserPlan(userData.plan as Plan);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const accountMap = useMemo(() => {
    const map = new Map<SocialPlatform, ConnectedAccount>();
    for (const account of accounts) {
      map.set(account.platform, account);
    }
    return map;
  }, [accounts]);

  async function connectPlatform(platform: SocialPlatform) {
    try {
      setBusyPlatform(platform);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/settings/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });

      const payload = await res.json();

      if (res.status === 403) {
        // Handle plan restriction
        if (payload.requiresUpgrade) {
          setShowUpgradeDialog(true);
          setError(payload.message || `Your plan doesn't support ${platform}`);
          setBusyPlatform(null);
          return;
        }
      }

      if (!res.ok) {
        throw new Error(payload?.error || `Failed to connect ${platform}`);
      }

      if (!payload?.authUrl) {
        throw new Error("Missing OAuth URL from server");
      }

      window.location.href = payload.authUrl as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to connect ${platform}`);
      setBusyPlatform(null);
    }
  }

  async function disconnectPlatform(platform: SocialPlatform) {
    try {
      setBusyPlatform(platform);
      setError(null);
      setMessage(null);

      const res = await fetch(`/api/settings/social-accounts/${platform}`, {
        method: "DELETE",
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || `Failed to disconnect ${platform}`);
      }

      setMessage(`${PLATFORM_LABELS[platform]} disconnected.`);
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to disconnect ${platform}`);
    } finally {
      setBusyPlatform(null);
    }
  }

  async function deleteAccount() {
    try {
      if (deleteConfirm !== "DELETE") {
        setError('Type "DELETE" to confirm account deletion.');
        return;
      }

      setDeleteBusy(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/settings/account", {
        method: "DELETE",
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete account");
      }

      window.location.href = "/sign-in";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="p-8 text-white min-h-screen">
      <div className="max-w-5xl mx-auto mt-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Settings</h1>
            <p className="mt-2 text-slate-400 text-lg">
              Connect social accounts now and use them later for one-click publishing.
            </p>
          </div>
          {userPlan && (
            <div className="text-right">
              <p className="text-sm text-slate-400 mb-1">Current Plan</p>
              <p className="text-2xl font-bold text-blue-400">{userPlan}</p>
            </div>
          )}
        </div>

        {message && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="text-2xl font-semibold mb-2">Social Media Connections</h2>
          <p className="text-slate-400 mb-6">
            Authorize platforms so future versions can publish generated videos automatically.
          </p>

          {loading ? (
            <div className="flex items-center text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading connections...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(platforms.length ? platforms : [
                { platform: "youtube", enabled: true, missingEnv: [] },
                { platform: "instagram", enabled: true, missingEnv: [] },
                { platform: "tiktok", enabled: true, missingEnv: [] },
              ]).map((p) => {
                const platform = p.platform as SocialPlatform;
                const connected = accountMap.get(platform);
                const Icon = PLATFORM_ICONS[platform];
                const isBusy = busyPlatform === platform;
                
                // Check if platform is locked for current plan
                const isPlatformLockedByPlan = !!(userPlan && platform !== "youtube" && userPlan !== "Unlimited");

                return (
                  <div
                    key={platform}
                    className={`rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col gap-4 ${
                      isPlatformLockedByPlan ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{PLATFORM_LABELS[platform]}</p>
                          <p className="text-xs text-slate-400">
                            {connected
                              ? `Connected as ${connected.account_name || connected.account_id || "Unknown"}`
                              : "Not connected"}
                          </p>
                        </div>
                      </div>
                      {isPlatformLockedByPlan && (
                        <div className="bg-blue-500/20 border border-blue-500/30 rounded px-2 py-1 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-200">Unlock</span>
                        </div>
                      )}
                    </div>

                    {!p.enabled && (
                      <p className="text-xs text-amber-300">
                        Missing env: {p.missingEnv.join(", ")}
                      </p>
                    )}

                    {connected ? (
                      <button
                        onClick={() => disconnectPlatform(platform)}
                        disabled={isBusy}
                        className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-2">
                          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink2 className="w-4 h-4" />}
                          Disconnect
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => isPlatformLockedByPlan ? null : connectPlatform(platform)}
                        disabled={!p.enabled || isBusy || isPlatformLockedByPlan}
                        className={`w-full rounded-lg border py-2 text-sm ${
                          isPlatformLockedByPlan
                            ? "border-slate-500/20 bg-slate-500/5 text-slate-400 cursor-not-allowed"
                            : "border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20"
                        } disabled:opacity-60`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          {isPlatformLockedByPlan ? `Unlock with Plan` : `Connect ${platform === "youtube" ? "YouTube" : platform === "instagram" ? "Instagram" : "TikTok"}`}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6">
          <h2 className="text-2xl font-semibold text-red-200 mb-2">Danger Zone</h2>
          <p className="text-red-200/80 mb-4">
            Deleting your account removes local data, social connections, and series.
          </p>

          <div className="rounded-xl border border-red-500/30 bg-black/20 p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-red-200/90">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <p>This action cannot be undone. Type DELETE to confirm.</p>
            </div>

            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white"
            />

            <button
              onClick={deleteAccount}
              disabled={deleteBusy || deleteConfirm !== "DELETE"}
              className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {deleteBusy ? "Deleting account..." : "Delete Account"}
            </button>
          </div>
        </section>
      </div>

      {userPlan && (
        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          currentPlan={userPlan}
          reason="platform_restriction"
        />
      )}
    </div>
  );
}
