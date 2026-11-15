import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

const STYLES = {
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: "alertCircle" as const },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "checkCircle" as const },
  info: { box: "border-sky-200 bg-sky-50 text-sky-800", icon: "alertCircle" as const },
};

export function Alert({ kind = "error", children }: { kind?: keyof typeof STYLES; children: ReactNode }) {
  const s = STYLES[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${s.box}`}>
      <Icon name={s.icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
