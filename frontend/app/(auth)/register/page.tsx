"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError, errorMessage } from "@/lib/api";
import { emailProblem, hasErrors, passwordProblem } from "@/lib/validation";
import type { Errors } from "@/lib/validation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";

type Key = "organizationName" | "name" | "email" | "password";

export default function RegisterPage() {
  const { status, register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ organizationName: "", name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors<Key>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authed") router.replace("/dashboard");
  }, [status, router]);

  const set = (key: Key) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found: Errors<Key> = {
      organizationName: form.organizationName.trim().length < 2 ? "Organization name is required" : undefined,
      name: form.name.trim().length < 2 ? "Your name is required" : undefined,
      email: emailProblem(form.email),
      password: passwordProblem(form.password),
    };
    setErrors(found);
    setFormError("");
    if (hasErrors(found)) return;

    setBusy(true);
    try {
      await register({
        organizationName: form.organizationName.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors({
          organizationName: err.fieldErrors.organizationName,
          name: err.fieldErrors.name,
          email: err.fieldErrors.email,
          password: err.fieldErrors.password,
        });
      } else {
        setFormError(errorMessage(err));
      }
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create your organization</h1>
      <p className="mt-1.5 text-sm text-slate-500">You become the administrator and can add your team later.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <TextField label="Organization name" autoComplete="organization" value={form.organizationName} onChange={set("organizationName")} error={errors.organizationName} />
        <TextField label="Your name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <TextField label="Work email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />
        <Button type="submit" loading={busy} className="w-full">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
