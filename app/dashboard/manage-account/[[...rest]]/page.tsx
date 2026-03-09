"use client";

import { UserProfile } from "@clerk/nextjs";

export default function ManageAccountPage() {
  return (
    <div className="p-6 md:p-8 text-white min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Manage Account</h1>
        <p className="text-slate-400 mb-6">
          Update your profile, security settings, and billing in one place.
        </p>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-2 md:p-4 overflow-x-auto">
          <UserProfile
            routing="path"
            path="/dashboard/manage-account"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 bg-transparent w-full",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
