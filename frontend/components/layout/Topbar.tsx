"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { initials, ROLE_LABEL } from "@/lib/format";
import { titleForPath } from "./nav";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Icon name="menu" />
      </button>

      <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{titleForPath(pathname)}</h2>

      <div className="relative ml-auto" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-slate-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
            {initials(user.name)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-slate-900">{user.name}</span>
            <span className="block text-xs leading-tight text-slate-500">{ROLE_LABEL[user.role]}</span>
          </span>
          <Icon name="chevronDown" className="hidden h-4 w-4 text-slate-400 sm:block" />
        </button>

        {open && (
          <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <div className="mt-2">
                <Badge tone="teal">{ROLE_LABEL[user.role]}</Badge>
              </div>
            </div>
            <div className="my-1 border-t border-slate-100" />
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Icon name="user" className="h-4 w-4 text-slate-400" /> My profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
                router.replace("/login");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Icon name="logout" className="h-4 w-4 text-slate-400" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
