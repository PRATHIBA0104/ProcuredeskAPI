import type { Metadata } from "next";
import { NewContractView } from "./NewContractView";

export const metadata: Metadata = { title: "Add contract" };

// Signed-in pages render on the client once the token is verified, so they opt out of instant-navigation checks.
export const instant = false;

export default function Page() {
  return <NewContractView />;
}
