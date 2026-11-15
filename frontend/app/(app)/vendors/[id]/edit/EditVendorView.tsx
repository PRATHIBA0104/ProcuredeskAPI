"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import type { Contract, Vendor } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { VendorForm } from "@/components/vendors/VendorForm";

export function EditVendorView({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { canWrite } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ vendor: Vendor; contracts: Contract[] }>(`/vendors/${id}`)
      .then((r) => setVendor(r.vendor))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  if (!canWrite) return <Alert>Your role is read-only, so you cannot edit vendors.</Alert>;
  if (error) return <Alert>{error}</Alert>;
  if (!vendor)
    return (
      <div className="flex justify-center py-16 text-teal-700">
        <Spinner className="h-7 w-7" />
      </div>
    );

  return (
    <>
      <PageHeader title={`Edit ${vendor.name}`} />
      <VendorForm
        initial={vendor}
        submitLabel="Save changes"
        cancelHref={`/vendors/${id}`}
        onSubmit={async (payload) => {
          await api.patch(`/vendors/${id}`, payload);
          toast.success("Vendor updated");
          router.push(`/vendors/${id}`);
        }}
      />
    </>
  );
}
