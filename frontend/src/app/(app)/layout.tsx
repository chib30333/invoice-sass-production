"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { Skeleton } from "@/components/ui";

/* Everything under (app) needs a session. The editor and onboarding render without the sidebar. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/sign-in?next=${encodeURIComponent(path)}`);
  }, [loading, user, router, path]);

  if (loading || !user) {
    return (
      <div className="shell">
        <aside className="side"><Skeleton w={160} h={28} /><Skeleton h={40} r={10} /><Skeleton h={40} r={10} /><Skeleton h={40} r={10} /></aside>
        <main className="main"><Skeleton w={220} h={44} r={8} /><div className="tiles"><Skeleton h={110} r={14} /><Skeleton h={110} r={14} /><Skeleton h={110} r={14} /></div><Skeleton h={320} r={14} /></main>
      </div>
    );
  }

  const bare = /^\/invoices\/\d+/.test(path) || path.startsWith("/onboarding");
  return (
    <>
      <CommandPalette />
      {bare ? children : (
        <div className="shell">
          <Sidebar />
          {children}
        </div>
      )}
    </>
  );
}
