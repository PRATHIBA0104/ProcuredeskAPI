import type { Metadata } from "next";
import { VendorDetailView } from "./VendorDetailView";

export const metadata: Metadata = { title: "Vendor" };
export const instant = false;

export default async function Page({ params }: PageProps<"/vendors/[id]">) {
  const { id } = await params;
  return <VendorDetailView id={id} />;
}
