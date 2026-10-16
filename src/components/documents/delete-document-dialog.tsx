"use client";

import { deleteDocumentAction } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/toast";
import { Trash2, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type DeleteDocumentDialogProps = {
  documentId: string;
  documentTitle: string;
};

export function DeleteDocumentDialog({
  documentId,
  documentTitle,
}: DeleteDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, pending]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    try {
      const result = await deleteDocumentAction(documentId);
      if (result.ok) {
        setOpen(false);
        appToast.success("Document deleted", "The document was permanently removed.");
        router.replace("/documents/mine");
        router.refresh();
      } else {
        appToast.error("Could not delete document", result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        data-testid="delete-document-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
        Delete
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close delete dialog"
            disabled={pending}
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="delete-document-dialog"
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-2">
                <h2 id={titleId} className="font-heading text-base font-medium">
                  Delete document?
                </h2>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {documentTitle.trim() || "Untitled"}
                  </span>{" "}
                  will be permanently deleted. Collaborators will lose access.
                  This cannot be undone.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={handleDelete}
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
