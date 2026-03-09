"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { PLAN_CONFIGS, type Plan } from "@/lib/plans";
import { toast } from "sonner";

type BillingPlan = Plan;

interface BillingData {
  currentPlan: BillingPlan;
  nextBillingDate?: string;
  cancelAtPeriodEnd?: boolean;
  subscriptionId?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

type ApiResponse = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
  rawText?: string;
};

function isBillingPlan(value: unknown): value is BillingPlan {
  return value === "Free" || value === "Basic" || value === "Unlimited";
}

function isBillingData(value: unknown): value is BillingData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return isBillingPlan(record.currentPlan);
}

const PRICING: Record<BillingPlan, { monthly: number; annual: number; popularity?: boolean }> = {
  Free: { monthly: 0, annual: 0 },
  Basic: { monthly: 29, annual: 290, popularity: true },
  Unlimited: { monthly: 99, annual: 990 },
};

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [upgrading, setUpgrading] = useState<BillingPlan | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [syncing, setSyncing] = useState(false);

  const parseApiResponse = useCallback(async (res: Response): Promise<ApiResponse> => {
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = (await res.json()) as Record<string, unknown>;
      return { ok: res.ok, status: res.status, data: json };
    }

    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      data: text ? { error: text } : {},
      rawText: text,
    };
  }, []);

  const loadBillingData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const res = await fetch("/api/billing/info", { cache: "no-store" });
      const { data, status } = await parseApiResponse(res);

      if (res.ok) {
        if (isBillingData(data)) {
          setBillingData(data);
        } else {
          toast.error("Billing response was invalid");
        }
      } else {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : status === 401
              ? "Unauthorized. Please sign in again."
              : "Failed to load billing info";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error loading billing data:", error);
      toast.error("Failed to load billing information");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [parseApiResponse]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadBillingData(false);
      }
    };

    const intervalId = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [isLoaded, user, loadBillingData]);

  const forceSyncPlan = useCallback(async (isManualSync = false) => {
    if (isManualSync) {
      setSyncing(true);
    }
    
    try {
      const res = await fetch("/api/billing/sync-plan", {
        method: "POST",
      });

      const { data, status } = await parseApiResponse(res);

      if (res.ok) {
        const updated = Boolean(data.updated);
        const previousPlan = typeof data.previousPlan === "string" ? data.previousPlan : "Unknown";
        const currentPlan = typeof data.currentPlan === "string" ? data.currentPlan : "Unknown";

        if (updated && isManualSync) {
          toast.success(`Plan synced: ${previousPlan} → ${currentPlan}`);
        } else if (isManualSync) {
          toast.info("Plan already up to date");
        }
        
        // Always reload billing data after sync
        if (updated) {
          await loadBillingData(false);
        }
      } else if (isManualSync) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : status === 401
              ? "Unauthorized. Please sign in again."
              : "Failed to sync plan";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Sync error:", error);
      if (isManualSync) {
        toast.error("Failed to sync plan");
      }
    } finally {
      if (isManualSync) {
        setSyncing(false);
      }
    }
  }, [loadBillingData, parseApiResponse]);

  useEffect(() => {
    if (isLoaded && user) {
      loadBillingData();
      // Also force a sync check when page first loads (in case user just returned from Clerk)
      void forceSyncPlan(false);
    }
  }, [isLoaded, user, loadBillingData, forceSyncPlan]);

  async function handleUpgrade(plan: BillingPlan) {
    if (plan === billingData?.currentPlan) {
      toast.info(`You're already on the ${plan} plan`);
      return;
    }

    try {
      setUpgrading(plan);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          billingPeriod: billing,
        }),
      });

      const { data, status } = await parseApiResponse(res);

      if (!res.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : status === 401
              ? "Unauthorized. Please sign in again."
              : "Failed to initiate checkout";
        throw new Error(errorMessage);
      }

      if (typeof data.checkoutUrl === "string") {
        window.location.href = data.checkoutUrl;
      } else {
        const message = typeof data.message === "string" ? data.message : "Plan updated";
        toast.success(message);
        await loadBillingData(false);
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error(error instanceof Error ? error.message : "Upgrade failed");
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const { data, status } = await parseApiResponse(res);

      if (res.ok && typeof data.portalUrl === "string") {
        window.location.href = data.portalUrl;
      } else {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : status === 401
              ? "Unauthorized. Please sign in again."
              : "Failed to access billing portal";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal");
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="p-8 text-white min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-slate-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const currentPlan = billingData?.currentPlan || "Free";
  const plans: BillingPlan[] = ["Free", "Basic", "Unlimited"];
  return (
    <div className="p-8 text-white min-h-screen bg-gradient-to-b from-slate-950 to-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Billing & Plans</h1>
              <p className="text-slate-400 text-lg">
                Manage your ReelPilot subscription and upgrade to unlock more features
              </p>
            </div>
            <Button
              onClick={() => forceSyncPlan(true)}
              disabled={syncing}
              variant="outline"
              className="border-blue-500/30 hover:bg-blue-500/10"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Plan
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Current Plan Banner */}
        {currentPlan !== "Free" && (
          <div className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-blue-200 mb-1">Current Plan</p>
                <p className="text-2xl font-bold text-blue-300">{currentPlan} Plan</p>
                {billingData?.nextBillingDate && (
                  <p className="text-sm text-slate-300 mt-2">
                    Next billing date: <span className="font-medium">{new Date(billingData.nextBillingDate).toLocaleDateString()}</span>
                  </p>
                )}
              </div>
              <Button
                onClick={handleManageBilling}
                variant="outline"
                className="border-blue-500/30 hover:bg-blue-500/10"
              >
                Manage Billing
              </Button>
            </div>
          </div>
        )}

        {/* Billing Period Toggle */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              billing === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              billing === "annual"
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            Annual
            <span className="ml-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
              Save 17%
            </span>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const config = PLAN_CONFIGS[plan];
            const price = PRICING[plan];
            const isCurrentPlan = plan === currentPlan;
            const isMostPopular = PRICING[plan as BillingPlan]?.popularity;

            return (
              <div
                key={plan}
                className={`relative rounded-2xl border transition ${
                  isCurrentPlan
                    ? "border-blue-500 bg-blue-500/5"
                    : isMostPopular
                      ? "border-purple-500 bg-purple-500/5"
                      : "border-white/10 bg-white/5"
                } p-8 flex flex-col`}
              >
                {isMostPopular && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-2xl font-bold mb-2">{config.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{config.description}</p>

                {/* Price */}
                <div className="mb-6">
                  {price.monthly === 0 ? (
                    <div className="text-3xl font-bold">Free</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        ${billing === "monthly" ? price.monthly : Math.floor(price.annual)}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        per {billing === "monthly" ? "month" : "year"}
                      </p>
                    </>
                  )}
                </div>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <Button
                    disabled
                    className="w-full mb-6 bg-white/10 text-white hover:bg-white/10"
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan)}
                    disabled={upgrading === plan}
                    className={`w-full mb-6 font-medium transition ${
                      isMostPopular
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {upgrading === plan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                        Processing...
                      </>
                    ) : plan === "Free" ? (
                      "Downgrade"
                    ) : (
                      "Upgrade Now"
                    )}
                  </Button>
                )}

                {/* Features */}
                <div className="space-y-3">
                  {config.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I change my plan anytime?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards via Stripe. Your payment information is secure and encrypted.",
              },
              {
                q: "Is there a free trial?",
                a: 'Yes! Start with the Free plan and upgrade anytime. No credit card required.',
              },
              {
                q: "What happens if I downgrade?",
                a: "You'll lose access to features not included in your new plan, but your videos and data remain safe.",
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 7-day money-back guarantee if you're not satisfied with your subscription.",
              },
            ].map((item, idx) => (
              <details
                key={idx}
                className="group rounded-lg border border-white/10 p-4 hover:border-blue-500/30 transition"
              >
                <summary className="cursor-pointer font-medium text-slate-200 flex items-center justify-between">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-180 transition">▼</span>
                </summary>
                <p className="mt-3 text-slate-400 text-sm">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <AlertCircle className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Need Help?</h3>
            <p className="text-slate-400 mb-4">
              Have questions about our plans or billing? Our support team is here to help.
            </p>
            <Button variant="outline" className="border-blue-500/30 hover:bg-blue-500/10">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
