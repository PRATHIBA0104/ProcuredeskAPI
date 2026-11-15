"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { APP_NAME } from "@/lib/config";
import { ACCOUNT_NAV, NAV_ITEMS } from "./nav";
import type { NavItem } from "./nav";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon name={item.icon} className={`h-5 w-5 ${active ? "text-teal-300" : "text-slate-400 group-hover:text-slate-200"}`} />
      {item.label}
    </Link>
  );
}

export function SidebarContent({ orgName, onNavigate }: { orgName?: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">P</span>
        <span className="text-base font-semibold tracking-tight text-white">{APP_NAME}</span>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
        <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Account</p>
        {ACCOUNT_NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      {orgName && (
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Organization</p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-200" title={orgName}>
            {orgName}
          </p>
        </div>
      )}
    </div>
  );
}
