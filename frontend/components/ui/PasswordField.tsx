"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Icon } from "@/components/icons";
import { TextField } from "./Field";

// A password input with a show/hide toggle. The toggle is a real button with an accessible name.
export function PasswordField(props: { label: string; error?: string; hint?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextField {...props} type={visible ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-2 top-[2.1rem] rounded-md p-1.5 text-slate-400 hover:text-slate-600"
      >
        <Icon name={visible ? "eyeOff" : "eye"} className="h-4 w-4" />
      </button>
    </div>
  );
}
