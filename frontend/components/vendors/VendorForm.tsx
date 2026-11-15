"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError, errorMessage } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/vendorMeta";
import { EMAIL_RE } from "@/lib/validation";
import type { Vendor, VendorCategory, VendorContact } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/icons";

interface Props {
  initial?: Vendor;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

type Errors = Record<string, string | undefined>;
const WEBSITE_RE = /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i;
const blankContact = (): VendorContact => ({ name: "", email: "", phone: "", role: "", isPrimary: false });

export function VendorForm({ initial, submitLabel, cancelHref, onSubmit }: Props) {
  const inactive = initial?.status === "inactive";
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<VendorCategory>(initial?.category ?? "software");
  const [status, setStatus] = useState<"active" | "prospect">(initial && initial.status !== "inactive" ? initial.status : "active");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [contacts, setContacts] = useState<VendorContact[]>(initial?.contacts.map((c) => ({ ...c })) ?? []);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const setContact = (i: number, patch: Partial<VendorContact>) => setContacts((list) => list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const makePrimary = (i: number) => setContacts((list) => list.map((c, idx) => ({ ...c, isPrimary: idx === i })));

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Vendor name must be at least 2 characters";
    if (website.trim() && !WEBSITE_RE.test(website.trim())) e.website = "Website must start with http:// or https://";
    contacts.forEach((c, i) => {
      if (!c.name.trim()) e[`contacts.${i}.name`] = "Contact name is required";
      if (c.email?.trim() && !EMAIL_RE.test(c.email.trim())) e[`contacts.${i}.email`] = "Contact email is not valid";
    });
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.values(found).some(Boolean)) return;

    const payload: Record<string, unknown> = {
      name: name.trim(),
      category,
      website: website.trim(),
      notes: notes.trim(),
      contacts: contacts.map((c) => ({
        name: c.name.trim(),
        email: c.email?.trim() ?? "",
        phone: c.phone?.trim() ?? "",
        role: c.role?.trim() ?? "",
        isPrimary: Boolean(c.isPrimary),
      })),
    };
    if (!inactive) payload.status = status; // an inactive vendor changes status only via Reactivate
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

      <Card>
        <CardHeader title="Vendor details" />
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label="Vendor name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={120} />
          </div>
          <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value as VendorCategory)} error={errors.category}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </SelectField>
          {inactive ? (
            <TextField label="Status" value="Inactive" disabled readOnly hint="Use Reactivate on the vendor page to change this." />
          ) : (
            <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as "active" | "prospect")} error={errors.status}>
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
            </SelectField>
          )}
          <div className="sm:col-span-2">
            <TextField label="Website" placeholder="https://example.com" value={website} onChange={(e) => setWebsite(e.target.value)} error={errors.website} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} maxLength={2000} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Contacts"
          description="People at the vendor you deal with. Up to 10."
          action={
            contacts.length < 10 ? (
              <Button variant="secondary" size="sm" onClick={() => setContacts((l) => [...l, { ...blankContact(), isPrimary: l.length === 0 }])}>
                <Icon name="plus" className="h-4 w-4" /> Add contact
              </Button>
            ) : undefined
          }
        />
        <div className="divide-y divide-slate-100">
          {contacts.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">No contacts added.</p>}
          {contacts.map((c, i) => (
            <fieldset key={i} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <legend className="sr-only">Contact {i + 1}</legend>
              <TextField label="Name" required value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} error={errors[`contacts.${i}.name`]} />
              <TextField label="Role" value={c.role ?? ""} onChange={(e) => setContact(i, { role: e.target.value })} />
              <TextField label="Email" type="email" value={c.email ?? ""} onChange={(e) => setContact(i, { email: e.target.value })} error={errors[`contacts.${i}.email`]} />
              <TextField label="Phone" value={c.phone ?? ""} onChange={(e) => setContact(i, { phone: e.target.value })} />
              <div className="flex items-center justify-between sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="primaryContact" checked={Boolean(c.isPrimary)} onChange={() => makePrimary(i)} className="h-4 w-4 accent-teal-700" />
                  Primary contact
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setContacts((l) => l.filter((_, idx) => idx !== i))}
                  aria-label={`Remove contact ${i + 1}`}
                >
                  <Icon name="trash" className="h-4 w-4" /> Remove
                </Button>
              </div>
            </fieldset>
          ))}
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
