"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import type { Contract } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ContractForm } from "@/components/contracts/ContractForm";

export function EditContractView({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { canWrite } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ contract: Contract }>(`/contracts/${id}`)
      .then((r) => setContract(r.contract))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  if (!canWrite) return <Alert>Your role is read-only, so you cannot edit contracts.</Alert>;
  if (error) return <Alert>{error}</Alert>;
  if (!contract)
    return (
      <div className="flex justify-center py-16 text-teal-700">
        <Spinner className="h-7 w-7" />
      </div>
    );
  if (contract.status === "terminated") return <Alert>A terminated contract can no longer be edited.</Alert>;

  return (
    <>
      <PageHeader title={`Edit ${contract.title}`} />
      <ContractForm
        initial={contract}
        submitLabel="Save changes"
        cancelHref={`/contracts/${id}`}
        onSubmit={async (payload) => {
          await api.patch(`/contracts/${id}`, payload);
          toast.success("Contract updated");
          router.push(`/contracts/${id}`);
        }}
      />
    </>
  );
}
