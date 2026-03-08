"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { PLAN_CONFIGS, type Plan } from "@/lib/plans";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: Plan;
  reason: "series_limit" | "platform_restriction" | "feature_access";
  requiredPlan?: Plan;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  currentPlan,
  reason,
  requiredPlan = "Unlimited",
}: UpgradeDialogProps) {
  const currentConfig = PLAN_CONFIGS[currentPlan];
  const requiredConfig = PLAN_CONFIGS[requiredPlan];

  const getReasonText = () => {
    switch (reason) {
      case "series_limit":
        return {
          title: "Series Limit Reached",
          description: `Your ${currentPlan} plan allows ${currentConfig.maxSeries} series. Upgrade to create more.`,
        };
      case "platform_restriction":
        return {
          title: "Platform Not Available",
          description: `Your ${currentPlan} plan only supports YouTube. Unlock Instagram and TikTok with ${requiredPlan}.`,
        };
      case "feature_access":
        return {
          title: "Premium Feature Locked",
          description: `This feature is only available on ${requiredPlan} plan. Upgrade now to access it.`,
        };
      default:
        return {
          title: "Upgrade Your Plan",
          description: "Upgrade to unlock more features and capabilities.",
        };
    }
  };

  const { title, description } = getReasonText();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-6">
          {/* Current Plan */}
          <div className="border border-muted rounded-lg p-4">
            <div className="text-sm font-semibold mb-3">{currentPlan} Plan</div>
            <ul className="space-y-2 text-sm">
              {currentConfig.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Required Plan */}
          <div className="border-2 border-primary/50 rounded-lg p-4 bg-primary/5">
            <div className="text-sm font-semibold mb-3 text-primary flex items-center gap-2">
              {requiredPlan} Plan
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                Recommended
              </span>
            </div>
            <ul className="space-y-2 text-sm">
              {requiredConfig.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
