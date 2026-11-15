import type { Metadata } from "next";
import { EditVendorView } from "./EditVendorView";

export const metadata: Metadata = { title: "Edit vendor" };
export const instant = false;

export default async function Page({ params }: PageProps<"/vendors/[id]/edit">) {
  const { id } = await params;
  return <EditVendorView id={id} />;
}
