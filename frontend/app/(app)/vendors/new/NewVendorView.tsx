"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Vendor } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { Alert } from "@/components/ui/Alert";
import { VendorForm } from "@/components/vendors/VendorForm";

export function NewVendorView() {
  const router = useRouter();
  const toast = useToast();
  const { canWrite } = useAuth();

  if (!canWrite) return <Alert>Your role is read-only, so you cannot add vendors.</Alert>;

  return (
    <>
      <PageHeader title="Add vendor" description="Create a vendor record. You can attach contracts to it afterwards." />
      <VendorForm
        submitLabel="Create vendor"
        cancelHref="/vendors"
        onSubmit={async (payload) => {
          const res = await api.post<{ vendor: Vendor }>("/vendors", payload);
          toast.success("Vendor created");
          router.push(`/vendors/${res.vendor._id}`);
        }}
      />
    </>
  );
}
