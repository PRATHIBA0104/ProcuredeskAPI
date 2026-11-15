import type { Metadata } from "next";
import { VendorsView } from "./VendorsView";

export const metadata: Metadata = { title: "Vendors" };

// Signed-in pages render on the client once the token is verified, so they opt out of instant-navigation checks.
export const instant = false;

export default function Page() {
  return <VendorsView />;
}
