import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { SeriesCard } from "@/components/dashboard/SeriesCard";
import Link from "next/link";
import { PlusCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  let dbSyncError: string | null = null;
  const email = user.emailAddresses[0]?.emailAddress;

  if (email) {
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`user_id.eq.${user.id},email.eq.${email}`)
      .maybeSingle();

    if (existingUser) {
      const { error } = await supabaseAdmin
        .from("users")
        .update({
          user_id: user.id,
          email: email,
          name: name,
        })
        .eq("id", existingUser.id);

      if (error) {
        dbSyncError = "Failed to update your account details.";
        if (error.code === "23505") {
          dbSyncError =
            "This email is already associated with another account.";
        }
      }
    } else {
      const { error } = await supabaseAdmin.from("users").insert({
        user_id: user.id,
        email: email,
        name: name,
        credits: 0,
        plan: "Free",
      });

      if (error) {
        dbSyncError = "Failed to create your account details.";
        if (error.code === "23505") {
          dbSyncError =
            "This email is already associated with another account. Please sign in with your original login method.";
        }
      }
    }
  }

  // Fetch user's series
  const { data: userSeries, error: seriesError } = await supabaseAdmin
    .from("series")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (seriesError) {
    console.error("Error fetching series:", seriesError);
  }

  return (
    <div className="p-8 text-white min-h-screen">
      <div className="max-w-7xl mx-auto mt-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              Dashboard
            </h1>
            <p className="mt-2 text-slate-400 text-lg">
              Welcome back, {user.firstName || "Creator"}!
            </p>
          </div>

          {userSeries && userSeries.length > 0 && (
            <Link href="/dashboard/create">
              <Button className="bg-white text-black hover:bg-slate-200">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Series
              </Button>
            </Link>
          )}
        </div>

        {dbSyncError && (
          <div className="mb-10 p-6 rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-red-500 mb-2">
              Account Error
            </h3>
            <p className="text-red-300/90">{dbSyncError}</p>
          </div>
        )}

        {/* Series Display Section */}
        {userSeries && userSeries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {userSeries.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        ) : (
          <div className="mt-10 p-12 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              No series created yet
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8 text-lg">
              Start dominating the algorithm by scheduling your AI-generated
              video series across multiple platforms.
            </p>
            <Link href="/dashboard/create">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-[0_0_20px_rgba(168,85,247,0.4)] rounded-full px-8 h-14 text-lg font-medium transition-all group"
              >
                <PlusCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Create Your First Series
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
