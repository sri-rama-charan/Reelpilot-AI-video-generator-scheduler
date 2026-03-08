// Plan types and constants
export type Plan = "Free" | "Basic" | "Unlimited";

export interface PlanConfig {
  name: string;
  maxSeries: number;
  allowedPlatforms: Array<"youtube" | "instagram" | "tiktok">;
  description: string;
  features: string[];
}

export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  Free: {
    name: "Free",
    maxSeries: 1,
    allowedPlatforms: ["youtube"],
    description: "Get started with ReelPilot",
    features: [
      "Create 1 series",
      "Connect YouTube & Email",
      "Basic video generation",
      "Community support",
    ],
  },
  Basic: {
    name: "Basic",
    maxSeries: 3,
    allowedPlatforms: ["youtube"],
    description: "For growing creators",
    features: [
      "Create up to 3 series",
      "Connect YouTube & Email",
      "Advanced video customization",
      "Priority support",
      "Scheduled publishing",
    ],
  },
  Unlimited: {
    name: "Unlimited",
    maxSeries: Infinity,
    allowedPlatforms: ["youtube", "instagram", "tiktok"],
    description: "For professional creators",
    features: [
      "Unlimited series",
      "Access all platforms (YouTube, Instagram, TikTok)",
      "Multi-platform publishing",
      "Advanced analytics",
      "24/7 premium support",
      "API access",
    ],
  },
};

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLAN_CONFIGS[plan];
}

export function canCreateSeries(plan: Plan, currentSeriesCount: number): boolean {
  const config = getPlanConfig(plan);
  return currentSeriesCount < config.maxSeries;
}

export function canConnectPlatform(plan: Plan, platform: "youtube" | "instagram" | "tiktok"): boolean {
  const config = getPlanConfig(plan);
  return config.allowedPlatforms.includes(platform);
}
