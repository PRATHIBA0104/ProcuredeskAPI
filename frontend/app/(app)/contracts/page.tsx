import type { Metadata } from "next";
import { ContractsView } from "./ContractsView";

export const metadata: Metadata = { title: "Contracts" };

// Signed-in pages render on the client once the token is verified, so they opt out of instant-navigation checks.
export const instant = false;

export default function Page() {
  return <ContractsView />;
}
