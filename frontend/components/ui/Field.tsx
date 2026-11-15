"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const BASE =
  "block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
const OK = "border-slate-300 focus:border-teal-600";
const BAD = "border-red-400 focus:border-red-500";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

// Label + control + hint/error, wired together for screen readers (aria-describedby / aria-invalid).
function FieldShell({ label, error, hint, required, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="text-red-600" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Shared = { label: string; error?: string; hint?: string };

export function TextField({ label, error, hint, required, className = "", ...rest }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${BASE} h-10 ${invalid ? BAD : OK} ${className}`}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  required,
  children,
  className = "",
  ...rest
}: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${BASE} h-10 ${invalid ? BAD : OK} ${className}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, required, className = "", ...rest }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${BASE} min-h-24 py-2 ${invalid ? BAD : OK} ${className}`}
          {...rest}
        />
      )}
    </FieldShell>
  );
}
