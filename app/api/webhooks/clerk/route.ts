import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  eventImpliesFreePlan,
  extractPlanFromPayload,
  extractUserIdFromPayload,
  isSubscriptionEvent,
} from "@/lib/billing-plan";

async function syncUserRecord(evt: WebhookEvent) {
  const userData = evt.data as {
    id: string;
    email_addresses?: Array<{ email_address?: string }>;
    first_name?: string | null;
    last_name?: string | null;
  };

  const { id, email_addresses, first_name, last_name } = userData;
  const email = email_addresses?.[0]?.email_address;
  if (!email) {
    console.error(`[clerk-webhook] No email for user ${id}`);
    return new Response("Error: No email provided", { status: 400 });
  }

  const name = `${first_name || ""} ${last_name || ""}`.trim();

  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id, user_id, email")
    .or(`user_id.eq.${id},email.eq.${email}`)
    .maybeSingle();

  let error;

  if (existingUser) {
    const result = await supabaseAdmin
      .from("users")
      .update({
        user_id: id,
        email,
        name,
      })
      .eq("id", existingUser.id);

    error = result.error;

    if (!error) {
      console.log(
        `[clerk-webhook] Updated user ${id} (db id: ${existingUser.id}), email: ${email}`,
      );
    }
  } else {
    const result = await supabaseAdmin.from("users").insert({
      user_id: id,
      email,
      name,
      credits: 0,
      plan: "Free",
    });

    error = result.error;

    if (!error) {
      console.log(`[clerk-webhook] Created new user ${id}, email: ${email}`);
    }
  }

  if (error) {
    console.error("[clerk-webhook] Error syncing user to Supabase:", error);
    return new Response(`Error syncing user: ${error.message}`, { status: 500 });
  }

  return new Response("", { status: 200 });
}

async function syncSubscriptionPlan(evt: WebhookEvent, payload: unknown) {
  const eventType = String(evt.type);
  const payloadData = evt.data as unknown;

  const clerkUserId =
    extractUserIdFromPayload(payloadData) ||
    extractUserIdFromPayload(payload) ||
    (typeof (payloadData as { id?: unknown }).id === "string"
      ? (payloadData as { id: string }).id
      : null);

  if (!clerkUserId) {
    console.warn(`[clerk-webhook] Subscription event ${eventType} missing user id`);
    return new Response("", { status: 200 });
  }

  const extractedPlan = extractPlanFromPayload(payloadData) || extractPlanFromPayload(payload);
  const plan = extractedPlan || (eventImpliesFreePlan(eventType) ? "Free" : null);

  if (!plan) {
    console.warn(`[clerk-webhook] Subscription event ${eventType} had no recognized plan`);
    return new Response("", { status: 200 });
  }

  const { data: existingUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, plan")
    .eq("user_id", clerkUserId)
    .maybeSingle();

  if (fetchError) {
    console.error("[clerk-webhook] Failed to fetch user for subscription sync:", fetchError);
    return new Response(`Error syncing subscription: ${fetchError.message}`, { status: 500 });
  }

  if (!existingUser) {
    console.warn(
      `[clerk-webhook] Subscription event for unknown user ${clerkUserId}, skipping plan sync`,
    );
    return new Response("", { status: 200 });
  }

  if (existingUser.plan === plan) {
    return new Response("", { status: 200 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ plan })
    .eq("id", existingUser.id);

  if (updateError) {
    console.error("[clerk-webhook] Failed to update subscription plan:", updateError);
    return new Response(`Error updating plan: ${updateError.message}`, { status: 500 });
  }

  console.log(`[clerk-webhook] Updated user ${clerkUserId} plan ${existingUser.plan} -> ${plan}`);
  return new Response("", { status: 200 });
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local",
    );
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  const eventType = String(evt.type);

  if (eventType === "user.created" || eventType === "user.updated") {
    return syncUserRecord(evt);
  }

  if (isSubscriptionEvent(eventType)) {
    return syncSubscriptionPlan(evt, payload);
  }

  return new Response("", { status: 200 });
}
