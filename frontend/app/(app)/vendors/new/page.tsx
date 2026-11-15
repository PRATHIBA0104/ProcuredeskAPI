import type { Metadata } from "next";
import { NewVendorView } from "./NewVendorView";

export const metadata: Metadata = { title: "Add vendor" };

// Signed-in pages render on the client once the token is verified, so they opt out of instant-navigation checks.
export const instant = false;

export default function Page() {
  return <NewVendorView />;
}
