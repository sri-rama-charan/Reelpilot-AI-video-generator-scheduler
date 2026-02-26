import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  let dbSyncError: string | null = null;

  // Sync user data to Supabase every time they sign in and visit the dashboard
  // This bypasses the need for webhooks and ngrok entirely!
  const email = user.emailAddresses[0]?.emailAddress;

  if (email) {
    // Connect to the specific database schema
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    // Check if user exists by comparing the 'user_id' column against Clerk's ID
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingUser) {
      // Update existing user
      const { error } = await supabaseAdmin
        .from("users")
        .update({
          email: email,
          name: name,
        })
        .eq("user_id", user.id);

      if (error) {
        dbSyncError = "Failed to update your account details.";
        if (error.code === "23505") {
          dbSyncError =
            "This email is already associated with another account.";
        } else {
          console.error(
            "Error updating user in Supabase:",
            JSON.stringify(error, null, 2),
          );
        }
      } else {
        console.log(
          "User successfully updated in Supabase (via Server Component)",
        );
      }
    } else {
      // Insert new user
      const { error } = await supabaseAdmin.from("users").insert({
        user_id: user.id,
        email: email,
        name: name,
        credits: 0,
      });

      if (error) {
        dbSyncError = "Failed to create your account details.";
        if (error.code === "23505") {
          dbSyncError =
            "This email is already associated with another account. Please sign in with your original login method.";
        } else {
          console.error(
            "Error inserting user into Supabase:",
            JSON.stringify(error, null, 2),
          );
        }
      } else {
        console.log(
          "User successfully inserted to Supabase (via Server Component)",
        );
      }
    }
  }

  return (
    <div className="p-8 text-white">
      <div className="max-w-4xl mx-auto mt-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
          Dashboard
        </h1>
        <p className="mt-4 text-slate-400 text-lg">
          Welcome back, {user.firstName || "Creator"}!
        </p>

        {dbSyncError ? (
          <div className="mt-10 p-6 rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-red-500 mb-2">
              Account Error
            </h3>
            <p className="text-red-300/90">{dbSyncError}</p>
          </div>
        ) : (
          <div className="mt-10 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <p className="text-slate-300">
              Your Supabase sync is working correctly. You can now safely query
              user data directly from Supabase for this application!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
