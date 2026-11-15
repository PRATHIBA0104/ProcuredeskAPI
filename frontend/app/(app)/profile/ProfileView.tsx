"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api, errorMessage } from "@/lib/api";
import { passwordProblem, hasErrors } from "@/lib/validation";
import type { Errors } from "@/lib/validation";
import { ROLE_LABEL } from "@/lib/format";
import type { User } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { useToast } from "@/components/ui/Toast";

function DetailsCard() {
  const { user, organization, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Name must be at least 2 characters");
    setError("");
    setBusy(true);
    try {
      const res = await api.patch<{ user: User }>("/auth/me", { name: name.trim() });
      setUser(res.user);
      toast.success("Profile updated");
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.name ?? err.message) : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Your details" description="How you appear to your team." />
      <form onSubmit={onSubmit} noValidate className="space-y-5 px-5 py-5">
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={error} autoComplete="name" />
        <TextField label="Email" value={user?.email ?? ""} disabled readOnly hint="Your email is your sign-in and cannot be changed here." />
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Organization</dt>
            <dd className="mt-1 font-medium text-slate-900">{organization?.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="mt-1">
              <Badge tone="teal">{user ? ROLE_LABEL[user.role] : ""}</Badge>
            </dd>
          </div>
        </dl>
        <Button type="submit" loading={busy}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

type PwKey = "currentPassword" | "newPassword" | "confirm";

function PasswordCard() {
  const toast = useToast();
  const empty = { currentPassword: "", newPassword: "", confirm: "" };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Errors<PwKey>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: PwKey) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found: Errors<PwKey> = {
      currentPassword: form.currentPassword ? undefined : "Current password is required",
      newPassword: passwordProblem(form.newPassword),
      confirm: form.confirm === form.newPassword ? undefined : "Passwords do not match",
    };
    setErrors(found);
    setFormError("");
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(empty);
      toast.success("Password updated");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors({ currentPassword: err.fieldErrors.currentPassword, newPassword: err.fieldErrors.newPassword });
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Change password" description="Use a password you do not use anywhere else." />
      <form onSubmit={onSubmit} noValidate className="space-y-5 px-5 py-5">
        {formError && <Alert>{formError}</Alert>}
        <PasswordField label="Current password" autoComplete="current-password" value={form.currentPassword} onChange={set("currentPassword")} error={errors.currentPassword} />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set("newPassword")}
          error={errors.newPassword}
          hint="At least 8 characters, with a letter and a number."
        />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        <Button type="submit" loading={busy}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

export function ProfileView() {
  return (
    <>
      <PageHeader title="My profile" description="Manage your account details and password." />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <DetailsCard />
        <PasswordCard />
      </div>
    </>
  );
}
