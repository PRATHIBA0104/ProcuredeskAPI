"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { SidebarContent } from "./Sidebar";
import { Topbar } from "./Topbar";

// Everything behind sign-in goes through this shell. It is the frontend half of route protection;
// the API enforces the real rules, so hiding a page here is a convenience, never the security.
export function AppShell({ children }: { children: ReactNode }) {
  const { status, organization } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (status === "anon") router.replace("/login");
  }, [status, router]);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // The label must not depend on `status`: auth state can change before this subtree hydrates, and a
  // different label than the server-rendered HTML causes a hydration mismatch.
  if (status !== "authed") return <FullPageSpinner label="Loading your workspace…" />;

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarContent orgName={organization?.name} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-xl">
            <SidebarContent orgName={organization?.name} onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
              aria-label="Close navigation menu"
            >
              <Icon name="x" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
