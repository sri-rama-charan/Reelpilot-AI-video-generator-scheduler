import { type Plan } from "@/lib/plans";

const PLAN_MATCHERS: Array<{ plan: Plan; keywords: string[] }> = [
  { plan: "Unlimited", keywords: ["unlimited", "pro", "enterprise", "premium"] },
  { plan: "Basic", keywords: ["basic", "starter", "growth"] },
  { plan: "Free", keywords: ["free", "trial", "hobby"] },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizePlanValue(value: unknown): Plan | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  for (const matcher of PLAN_MATCHERS) {
    if (matcher.keywords.some((keyword) => normalized.includes(keyword))) {
      return matcher.plan;
    }
  }

  return null;
}

function findStringByKnownKeys(
  value: unknown,
  keys: Set<string>,
  depth = 0,
): string | null {
  if (depth > 6) return null;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKnownKeys(item, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const [key, nested] of Object.entries(value)) {
    if (keys.has(key)) {
      if (typeof nested === "string") return nested;
      if (isRecord(nested) && typeof nested.id === "string") return nested.id;
    }

    const found = findStringByKnownKeys(nested, keys, depth + 1);
    if (found) return found;
  }

  return null;
}

export function extractUserIdFromPayload(payload: unknown): string | null {
  return findStringByKnownKeys(
    payload,
    new Set([
      "user_id",
      "userId",
      "clerk_user_id",
      "clerkUserId",
      "actor_user_id",
      "actorUserId",
    ]),
  );
}

export function extractPlanFromPayload(payload: unknown): Plan | null {
  const candidate = findStringByKnownKeys(
    payload,
    new Set([
      "plan",
      "plan_name",
      "planName",
      "plan_slug",
      "planSlug",
      "tier",
      "slug",
      "lookup_key",
      "lookupKey",
      "price_id",
      "priceId",
      "product",
      "product_name",
      "productName",
    ]),
  );

  return normalizePlanValue(candidate);
}

export function isSubscriptionEvent(eventType: string): boolean {
  const normalized = eventType.toLowerCase();
  return normalized.includes("subscription") || normalized.includes("billing");
}

export function eventImpliesFreePlan(eventType: string): boolean {
  const normalized = eventType.toLowerCase();
  return (
    normalized.includes("cancel") ||
    normalized.includes("ended") ||
    normalized.includes("expire") ||
    normalized.includes("revoked")
  );
}

export function extractPlanFromUserMetadata(user: {
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
} | null | undefined): Plan | null {
  if (!user) return null;

  return (
    normalizePlanValue(user.publicMetadata?.plan) ||
    normalizePlanValue(user.unsafeMetadata?.plan) ||
    normalizePlanValue(user.privateMetadata?.plan)
  );
}
