"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { effectiveStatus } from "@/lib/contractMeta";
import { CATEGORY_LABEL } from "@/lib/vendorMeta";
import type { Vendor, VendorContractRow } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Badge, contractStatusTone, vendorStatusTone } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/icons";

interface Detail {
  vendor: Vendor;
  contracts: VendorContractRow[];
}

export function VendorDetailView({ id }: { id: string }) {
  const { canWrite, canManage } = useAuth();
  const toast = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"deactivate" | "activate" | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const [version, setVersion] = useState(0); // bump to reload after an action
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Detail>(`/vendors/${id}`)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  async function runAction() {
    if (!confirm) return;
    setBusy(true);
    setDialogError("");
    try {
      await api.post(`/vendors/${id}/${confirm}`);
      toast.success(confirm === "deactivate" ? "Vendor deactivated" : "Vendor reactivated");
      setConfirm(null);
      reload();
    } catch (err) {
      setDialogError(errorMessage(err)); // e.g. "Cannot deactivate: this vendor still has 2 active contracts"
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!detail)
    return (
      <div className="flex justify-center py-16 text-teal-700">
        <Spinner className="h-7 w-7" />
      </div>
    );

  const { vendor, contracts } = detail;
  const inactive = vendor.status === "inactive";

  return (
    <>
      <Link href="/vendors" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700">
        <Icon name="chevronLeft" className="h-4 w-4" /> All vendors
      </Link>
      <PageHeader
        title={vendor.name}
        description={CATEGORY_LABEL[vendor.category]}
        actions={
          <>
            <Badge tone={vendorStatusTone(vendor.status)}>{vendor.status}</Badge>
            {canWrite && (
              <LinkButton href={`/vendors/${id}/edit`} variant="secondary">
                <Icon name="edit" className="h-4 w-4" /> Edit
              </LinkButton>
            )}
            {canManage &&
              (inactive ? (
                <Button variant="secondary" onClick={() => { setDialogError(""); setConfirm("activate"); }}>
                  Reactivate
                </Button>
              ) : (
                <Button variant="danger" onClick={() => { setDialogError(""); setConfirm("deactivate"); }}>
                  Deactivate
                </Button>
              ))}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Contracts"
              description="Everything signed with this vendor."
              action={
                canWrite && !inactive ? (
                  <LinkButton href={`/contracts/new?vendorId=${id}`} size="sm">
                    <Icon name="plus" className="h-4 w-4" /> Add contract
                  </LinkButton>
                ) : undefined
              }
            />
            {contracts.length === 0 ? (
              <EmptyState icon={<Icon name="file" />} title="No contracts with this vendor" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Contract</th>
                      <th scope="col" className="px-5 py-3 font-medium">Ends</th>
                      <th scope="col" className="px-5 py-3 font-medium">Status</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Annual value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contracts.map((c) => {
                      const st = effectiveStatus(c.status, c.endDate);
                      return (
                        <tr key={c._id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <Link href={`/contracts/${c._id}`} className="font-medium text-slate-900 hover:text-teal-700 hover:underline">
                              {c.title}
                            </Link>
                            {c.contractNumber && <p className="text-xs text-slate-500">{c.contractNumber}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{formatDate(c.endDate)}</td>
                          <td className="px-5 py-3.5">
                            <Badge tone={contractStatusTone(st)}>{st}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{formatINR(c.annualValue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {vendor.notes && (
            <Card>
              <CardHeader title="Notes" />
              <p className="whitespace-pre-wrap px-5 py-4 text-sm text-slate-700">{vendor.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="space-y-3 px-5 py-4 text-sm">
              <div>
                <dt className="text-slate-500">Website</dt>
                <dd className="mt-0.5 break-all">
                  {vendor.website ? (
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                      {vendor.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Added</dt>
                <dd className="mt-0.5 text-slate-900">{formatDate(vendor.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Contacts" />
            {vendor.contacts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">No contacts recorded.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {vendor.contacts.map((c, i) => (
                  <li key={c._id ?? i} className="px-5 py-3.5 text-sm">
                    <p className="font-medium text-slate-900">
                      {c.name} {c.isPrimary && <Badge tone="teal">primary</Badge>}
                    </p>
                    {c.role && <p className="text-slate-500">{c.role}</p>}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="block break-all text-teal-700 hover:underline">
                        {c.email}
                      </a>
                    )}
                    {c.phone && <p className="text-slate-600">{c.phone}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "deactivate" ? `Deactivate ${vendor.name}?` : `Reactivate ${vendor.name}?`}
        confirmLabel={confirm === "deactivate" ? "Deactivate" : "Reactivate"}
        danger={confirm === "deactivate"}
        busy={busy}
        error={dialogError}
        onConfirm={runAction}
        onCancel={() => setConfirm(null)}
      >
        {confirm === "deactivate"
          ? "Inactive vendors cannot receive new contracts. A vendor with contracts still in force cannot be deactivated."
          : "The vendor becomes active again and can receive new contracts."}
      </ConfirmDialog>
    </>
  );
}
