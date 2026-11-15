"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, downloadFile, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { formatBytes } from "@/lib/contractMeta";
import type { ContractDocument } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Icon } from "@/components/icons";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /\.(pdf|doc|docx)$/i;

export function DocumentsPanel({ contractId, documents, onChanged }: { contractId: string; documents: ContractDocument[]; onChanged: () => void }) {
  const { canWrite, canManage } = useAuth();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<ContractDocument | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError("");
    // The server re-checks everything (including the real file content); these checks just save a round trip.
    if (!ALLOWED.test(file.name)) return setError("Only PDF, DOC and DOCX files are allowed.");
    if (file.size > MAX_BYTES) return setError("The file is larger than 10 MB.");
    if (file.size === 0) return setError("The file is empty.");

    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      await api.upload(`/contracts/${contractId}/documents`, form);
      toast.success("Document uploaded");
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function download(doc: ContractDocument) {
    try {
      await downloadFile(`/contracts/${contractId}/documents/${doc._id}`, doc.originalName);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setRemoveBusy(true);
    setRemoveError("");
    try {
      await api.delete(`/contracts/${contractId}/documents/${removing._id}`);
      toast.success("Document removed");
      setRemoving(null);
      onChanged();
    } catch (err) {
      setRemoveError(errorMessage(err));
    } finally {
      setRemoveBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Documents"
        description="PDF, DOC or DOCX, up to 10 MB each."
        action={
          canWrite ? (
            <>
              <input ref={input} type="file" accept=".pdf,.doc,.docx" className="sr-only" aria-label="Choose a document to upload" onChange={(e) => void onPick(e.target.files?.[0])} />
              <Button variant="secondary" size="sm" loading={uploading} onClick={() => input.current?.click()}>
                <Icon name="upload" className="h-4 w-4" /> Upload
              </Button>
            </>
          ) : undefined
        }
      />
      {error && (
        <div className="px-5 pt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {documents.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">No documents attached yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documents.map((d) => (
            <li key={d._id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{d.originalName}</p>
                <p className="text-xs text-slate-500">
                  {formatBytes(d.size)} · uploaded {formatDate(d.uploadedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => void download(d)} aria-label={`Download ${d.originalName}`}>
                  <Icon name="download" className="h-4 w-4" />
                </Button>
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => { setRemoveError(""); setRemoving(d); }} aria-label={`Remove ${d.originalName}`}>
                    <Icon name="trash" className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={removing !== null} title="Remove this document?" confirmLabel="Remove" danger busy={removeBusy} error={removeError} onConfirm={confirmRemove} onCancel={() => setRemoving(null)}>
        {removing?.originalName} will be permanently deleted.
      </ConfirmDialog>
    </Card>
  );
}
