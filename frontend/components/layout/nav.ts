import type { IconName } from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

// Only pages that exist and work are listed: no dead links.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/vendors", label: "Vendors", icon: "building" },
  { href: "/contracts", label: "Contracts", icon: "file" },
];

export const ACCOUNT_NAV: NavItem[] = [{ href: "/profile", label: "My profile", icon: "user" }];

// Page titles for the top bar, matched by the start of the path.
export function titleForPath(pathname: string): string {
  const all = [...NAV_ITEMS, ...ACCOUNT_NAV];
  return all.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label ?? "";
}
