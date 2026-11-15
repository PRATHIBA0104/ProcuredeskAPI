"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, api, errorMessage } from "@/lib/api";
import { PAYMENT_LABEL, PAYMENT_TERMS, PRICING_LABEL, PRICING_MODELS } from "@/lib/contractMeta";
import type { Contract, PaymentTerms, PricingModel, Vendor } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";

interface Props {
  /** Present when editing. */
  initial?: Contract;
  presetVendorId?: string;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

type Errors = Record<string, string | undefined>;
const day = (v?: string) => (v ? v.slice(0, 10) : "");
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v).toISOString().slice(0, 10) === v;

export function ContractForm({ initial, presetVendorId, submitLabel, cancelHref, onSubmit }: Props) {
  const editing = Boolean(initial);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsError, setVendorsError] = useState("");

  const [vendorId, setVendorId] = useState(initial?.vendorId ?? presetVendorId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [contractNumber, setContractNumber] = useState(initial?.contractNumber ?? "");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [startDate, setStartDate] = useState(day(initial?.startDate));
  const [endDate, setEndDate] = useState(day(initial?.endDate));
  const [renewalDate, setRenewalDate] = useState(day(initial?.renewalDate));
  const [noticePeriodDays, setNotice] = useState(String(initial?.noticePeriodDays ?? 30));
  const [autoRenew, setAutoRenew] = useState(initial?.autoRenew ?? false);
  const [totalValue, setTotalValue] = useState(initial ? String(initial.totalValue) : "");
  // Left empty on purpose: the API hides whether the annual value was typed or calculated, and sending it
  // would turn a calculated value into a fixed one. Empty means "keep as is" (or calculate, on a new contract).
  const [annualValue, setAnnualValue] = useState("");
  const [pricingModel, setPricing] = useState<PricingModel>(initial?.pricingModel ?? "fixed");
  const [paymentTerms, setPayment] = useState<PaymentTerms>(initial?.paymentTerms ?? "net_30");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) return; // the vendor of an existing contract cannot be changed
    api
      .get<{ data: Vendor[] }>("/vendors", { status: "active", sort: "name", limit: 100 })
      .then((r) => setVendors(r.data))
      .catch((err) => setVendorsError(errorMessage(err)));
  }, [editing]);

  function validate(): Errors {
    const e: Errors = {};
    if (!editing && !vendorId) e.vendorId = "Choose a vendor";
    if (title.trim().length < 2) e.title = "Title must be at least 2 characters";
    if (!isDate(startDate)) e.startDate = "Enter a start date";
    if (!isDate(endDate)) e.endDate = "Enter an end date";
    if (isDate(startDate) && isDate(endDate) && endDate <= startDate) e.endDate = "End date must be after the start date";
    if (renewalDate) {
      if (!isDate(renewalDate)) e.renewalDate = "Enter a valid date";
      else if (isDate(startDate) && isDate(endDate) && (renewalDate < startDate || renewalDate > endDate)) e.renewalDate = "Renewal date must fall between the start and end dates";
    }
    const notice = Number(noticePeriodDays);
    if (noticePeriodDays === "" || !Number.isInteger(notice) || notice < 0 || notice > 730) e.noticePeriodDays = "Enter whole days between 0 and 730";
    if (totalValue === "" || Number.isNaN(Number(totalValue)) || Number(totalValue) < 0) e.totalValue = "Enter the total value (0 or more)";
    if (annualValue !== "" && (Number.isNaN(Number(annualValue)) || Number(annualValue) < 0)) e.annualValue = "Annual value must be 0 or more";
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.values(found).some(Boolean)) return;

    const payload: Record<string, unknown> = {
      title: title.trim(),
      contractNumber: contractNumber.trim(),
      startDate,
      endDate,
      noticePeriodDays: Number(noticePeriodDays),
      autoRenew,
      totalValue: Number(totalValue),
      pricingModel,
      paymentTerms,
      notes: notes.trim(),
    };
    if (renewalDate) payload.renewalDate = renewalDate;
    if (annualValue !== "") payload.annualValue = Number(annualValue);
    if (!editing) {
      payload.vendorId = vendorId;
      payload.status = status;
    }

    setBusy(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors);
        setFormError(err.message === "Validation failed" ? "Please fix the highlighted fields." : err.message);
      } else {
        setFormError(errorMessage(err));
      }
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-6">
      {formError && <Alert>{formError}</Alert>}
      {vendorsError && <Alert>{vendorsError}</Alert>}

      <Card>
        <CardHeader title="Contract" />
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          {!editing && (
            <div className="sm:col-span-2">
              <SelectField label="Vendor" required value={vendorId} onChange={(e) => setVendorId(e.target.value)} error={errors.vendorId} hint={vendors.length === 0 && !vendorsError ? "No active vendors yet. Add a vendor first." : undefined}>
                <option value="">Select a vendor…</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </SelectField>
            </div>
          )}
          <div className="sm:col-span-2">
            <TextField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={150} />
          </div>
          <TextField label="Contract number" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} error={errors.contractNumber} hint="Optional. Must be unique in your organization." maxLength={60} />
          {!editing && (
            <SelectField label="Initial status" value={status} onChange={(e) => setStatus(e.target.value as "draft" | "active")} error={errors.status} hint="A draft can be activated later.">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </SelectField>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Dates and renewal" />
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          <TextField label="Start date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} error={errors.startDate} />
          <TextField label="End date" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} error={errors.endDate} />
          <TextField label="Renewal date" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} error={errors.renewalDate} hint="Optional. Defaults to the end date." />
          <TextField label="Notice period (days)" type="number" min={0} max={730} value={noticePeriodDays} onChange={(e) => setNotice(e.target.value)} error={errors.noticePeriodDays} hint="Days before the end date by which you must give notice." />
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="h-4 w-4 accent-teal-700" />
            Renews automatically unless notice is given
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Commercials" description="Amounts are in Indian rupees (INR)." />
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          <TextField label="Total contract value (₹)" type="number" min={0} step="any" required value={totalValue} onChange={(e) => setTotalValue(e.target.value)} error={errors.totalValue} />
          <TextField
            label="Annual value (₹)"
            type="number"
            min={0}
            step="any"
            value={annualValue}
            onChange={(e) => setAnnualValue(e.target.value)}
            error={errors.annualValue}
            hint={
              annualValue === "" && initial?.annualValue != null
                ? `Currently ₹${initial.annualValue.toLocaleString("en-IN")}. Leave empty to keep it in step with the value and dates; type a number to fix it.`
                : "Optional. Leave empty to calculate it from the total value and dates."
            }
          />
          <SelectField label="Pricing model" value={pricingModel} onChange={(e) => setPricing(e.target.value as PricingModel)} error={errors.pricingModel}>
            {PRICING_MODELS.map((m) => (
              <option key={m} value={m}>
                {PRICING_LABEL[m]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Payment terms" value={paymentTerms} onChange={(e) => setPayment(e.target.value as PaymentTerms)} error={errors.paymentTerms}>
            {PAYMENT_TERMS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_LABEL[m]}
              </option>
            ))}
          </SelectField>
          <div className="sm:col-span-2">
            <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} maxLength={2000} />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
        <LinkButton href={cancelHref} variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
