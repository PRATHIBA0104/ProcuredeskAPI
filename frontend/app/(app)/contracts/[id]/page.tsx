import type { Metadata } from "next";
import { ContractDetailView } from "./ContractDetailView";

export const metadata: Metadata = { title: "Contract" };
export const instant = false;

export default async function Page({ params }: PageProps<"/contracts/[id]">) {
  const { id } = await params;
  return <ContractDetailView id={id} />;
}
