"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  VideoIcon,
  Clapperboard,
  BookOpen,
  CreditCard,
  Settings,
  Zap,
  User,
  Plus,
} from "lucide-react";

const mainNavItems = [
  { title: "Series", icon: Clapperboard, href: "/dashboard/series" },
  { title: "Videos", icon: VideoIcon, href: "/dashboard/videos" },
  { title: "Guides", icon: BookOpen, href: "/dashboard/guides" },
  { title: "Billing", icon: CreditCard, href: "/dashboard/billing" },
  { title: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const footerNavItems = [
  {
    title: "Upgrade",
    icon: Zap,
    href: "/dashboard/upgrade",
    className: "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10",
  },
  { title: "Profile", icon: User, href: "/dashboard/profile" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen border-r border-white/10 bg-black/50 backdrop-blur-xl flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 text-white transition-opacity hover:opacity-80"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <VideoIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Reelpilot</span>
        </Link>
      </div>

      <div className="px-4 pb-4">
        <Link
          href="/dashboard/series/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white text-black hover:bg-gray-200 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create new series
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        {mainNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative
                ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{item.title}</span>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-3 mt-auto border-t border-white/10 space-y-1">
        {footerNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
                ${item.className || (isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5")}
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
