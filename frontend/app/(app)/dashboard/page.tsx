import type { Metadata } from "next";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

// Signed-in pages render on the client once the token is verified, so they opt out of instant-navigation checks.
export const instant = false;

export default function DashboardPage() {
  return <DashboardView />;
}
