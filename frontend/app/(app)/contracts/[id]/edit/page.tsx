import type { Metadata } from "next";
import { EditContractView } from "./EditContractView";

export const metadata: Metadata = { title: "Edit contract" };
export const instant = false;

export default async function Page({ params }: PageProps<"/contracts/[id]/edit">) {
  const { id } = await params;
  return <EditContractView id={id} />;
}
