"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDaysLeft, formatINR } from "@/lib/format";
import { PAYMENT_LABEL, PRICING_LABEL } from "@/lib/contractMeta";
import type { Contract } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { DocumentsPanel } from "@/components/contracts/DocumentsPanel";
import { Icon } from "@/components/icons";

type Detail = Contract & { vendor: { _id: string; name: string } | null };

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function ContractDetailView({ id }: { id: string }) {
  const { canWrite, canManage } = useAuth();
  const toast = useToast();
  const [contract, setContract] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"active" | "terminated" | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const [version, setVersion] = useState(0); // bump to reload after an action
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ contract: Detail }>(`/contracts/${id}`)
      .then((r) => {
        if (cancelled) return;
        setContract(r.contract);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  async function changeStatus() {
    if (!confirm) return;
    setBusy(true);
    setDialogError("");
    try {
      await api.post(`/contracts/${id}/status`, { status: confirm });
      toast.success(confirm === "active" ? "Contract activated" : "Contract terminated");
      setConfirm(null);
      reload();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!contract)
    return (
      <div className="flex justify-center py-16 text-teal-700">
        <Spinner className="h-7 w-7" />
      </div>
    );

  const c = contract;
  const inForce = c.effectiveStatus === "active" || c.effectiveStatus === "expiring";
  const noticePassed = inForce && c.daysToNoticeDeadline < 0;

  return (
    <>
      <Link href="/contracts" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700">
        <Icon name="chevronLeft" className="h-4 w-4" /> All contracts
      </Link>
      <PageHeader
        title={c.title}
        description={[c.contractNumber, c.vendor?.name].filter(Boolean).join(" · ")}
        actions={
          <>
            <Badge tone={contractStatusTone(c.effectiveStatus)}>{c.effectiveStatus}</Badge>
            {canWrite && c.status !== "terminated" && (
              <LinkButton href={`/contracts/${id}/edit`} variant="secondary">
                <Icon name="edit" className="h-4 w-4" /> Edit
              </LinkButton>
            )}
            {canManage && c.status === "draft" && (
              <Button onClick={() => { setDialogError(""); setConfirm("active"); }}>Activate</Button>
            )}
            {canManage && (c.status === "draft" || c.status === "active") && (
              <Button variant="danger" onClick={() => { setDialogError(""); setConfirm("terminated"); }}>
                Terminate
              </Button>
            )}
          </>
        }
      />

      {inForce && (
        <div className="mb-6">
          <Alert kind={noticePassed ? "error" : c.daysToNoticeDeadline <= 30 ? "info" : "success"}>
            {noticePassed
              ? `The notice deadline (${formatDate(c.noticeDeadline)}) has passed. ${c.autoRenew ? "This contract will renew automatically." : "Negotiate the renewal now."}`
              : `Notice deadline: ${formatDate(c.noticeDeadline)} (${formatDaysLeft(c.daysToNoticeDeadline)}). The contract ends ${formatDate(c.endDate)}.`}
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Terms" />
            <dl className="grid gap-5 px-5 py-5 text-sm sm:grid-cols-2">
              <Term label="Vendor">
                {c.vendor ? (
                  <Link href={`/vendors/${c.vendor._id}`} className="text-teal-700 hover:underline">
                    {c.vendor.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Term>
              <Term label="Contract number">{c.contractNumber || "—"}</Term>
              <Term label="Start date">{formatDate(c.startDate)}</Term>
              <Term label="End date">{formatDate(c.endDate)}</Term>
              <Term label="Renewal date">{formatDate(c.nextRenewalDate)}</Term>
              <Term label="Notice period">{c.noticePeriodDays} days</Term>
              <Term label="Auto-renews">{c.autoRenew ? "Yes" : "No"}</Term>
              {c.terminatedAt && <Term label="Terminated on">{formatDate(c.terminatedAt)}</Term>}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Commercials" />
            <dl className="grid gap-5 px-5 py-5 text-sm sm:grid-cols-2">
              <Term label="Total value">{formatINR(c.totalValue)}</Term>
              <Term label="Annual value">{formatINR(c.annualValue)}</Term>
              <Term label="Pricing model">{c.pricingModel ? PRICING_LABEL[c.pricingModel] : "—"}</Term>
              <Term label="Payment terms">{c.paymentTerms ? PAYMENT_LABEL[c.paymentTerms] : "—"}</Term>
            </dl>
          </Card>
          {c.notes && (
            <Card>
              <CardHeader title="Notes" />
              <p className="whitespace-pre-wrap px-5 py-4 text-sm text-slate-700">{c.notes}</p>
            </Card>
          )}
        </div>

        <div>
          <DocumentsPanel contractId={id} documents={c.documents ?? []} onChanged={reload} />
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "active" ? "Activate this contract?" : "Terminate this contract?"}
        confirmLabel={confirm === "active" ? "Activate" : "Terminate"}
        danger={confirm === "terminated"}
        busy={busy}
        error={dialogError}
        onConfirm={changeStatus}
        onCancel={() => setConfirm(null)}
      >
        {confirm === "active"
          ? "It will count toward active contracts and renewal alerts."
          : "A terminated contract can no longer be edited or reactivated. This cannot be undone."}
      </ConfirmDialog>
    </>
  );
}
