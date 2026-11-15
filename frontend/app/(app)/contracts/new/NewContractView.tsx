"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Contract } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ContractForm } from "@/components/contracts/ContractForm";

export function NewContractView() {
  const router = useRouter();
  const toast = useToast();
  const { canWrite } = useAuth();
  const presetVendorId = useSearchParams().get("vendorId") ?? undefined;

  if (!canWrite) return <Alert>Your role is read-only, so you cannot add contracts.</Alert>;

  return (
    <>
      <PageHeader title="Add contract" description="Record the commercial terms. You can attach the signed document afterwards." />
      <ContractForm
        presetVendorId={presetVendorId}
        submitLabel="Create contract"
        cancelHref="/contracts"
        onSubmit={async (payload) => {
          const res = await api.post<{ contract: Contract }>("/contracts", payload);
          toast.success("Contract created");
          router.push(`/contracts/${res.contract._id}`);
        }}
      />
    </>
  );
}
