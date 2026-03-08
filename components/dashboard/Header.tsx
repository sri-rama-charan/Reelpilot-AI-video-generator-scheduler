import { UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        {/* Optional Search or Breadcrumbs could go here */}
      </div>

      <div className="flex items-center gap-4">
        {/* Profile Button from Clerk */}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-9 h-9 border border-white/20",
            },
          }}
        />
      </div>
    </header>
  );
}
