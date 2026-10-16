"use client";

import {
  createShareAction,
  listSharesAction,
  revokeShareAction,
  updateShareAction,
  type ShareRecord,
} from "@/app/actions/shares";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appToast } from "@/lib/toast";
import { Share2, Trash2, XIcon } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";

type ShareDocumentDialogProps = {
  documentId: string;
};

export function ShareDocumentDialog({ documentId }: ShareDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"editor" | "viewer">("viewer");
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const loadShares = useCallback(() => {
    startTransition(async () => {
      const result = await listSharesAction(documentId);
      if (result.ok) {
        setShares(result.data);
        setError(null);
      } else {
        setError(result.error);
        appToast.error("Could not load collaborators", result.error);
      }
    });
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    loadShares();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loadShares]);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  function handleInvite() {
    setError(null);
    startTransition(async () => {
      const result = await createShareAction({
        documentId,
        email,
        permission,
      });
      if (result.ok) {
        setEmail("");
        loadShares();
        appToast.success(
          "Invitation sent",
          `${email.trim()} can access this document as ${permission === "editor" ? "an editor" : "a viewer"}.`,
        );
      } else {
        setError(result.error);
        appToast.error("Could not send invitation", result.error);
      }
    });
  }

  function handleRoleChange(shareId: string, next: "editor" | "viewer") {
    startTransition(async () => {
      const result = await updateShareAction({
        documentId,
        shareId,
        permission: next,
      });
      if (result.ok) {
        loadShares();
        appToast.success(
          "Permission updated",
          `Collaborator is now a ${next === "editor" ? "editor" : "viewer"}.`,
        );
      } else {
        setError(result.error);
        appToast.error("Could not update permission", result.error);
      }
    });
  }

  function handleRevoke(shareId: string, name: string) {
    if (!window.confirm(`Revoke access for ${name}?`)) return;
    startTransition(async () => {
      const result = await revokeShareAction({ documentId, shareId });
      if (result.ok) {
        loadShares();
        appToast.success("Access revoked", `${name} can no longer open this document.`);
      } else {
        setError(result.error);
        appToast.error("Could not revoke access", result.error);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        data-testid="share-document-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Share2 className="size-4" aria-hidden />
        Share
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close share dialog"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="share-document-dialog"
            tabIndex={-1}
            className="relative z-10 grid w-full max-w-md gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-2">
                <h2 id={titleId} className="font-heading text-base font-medium">
                  Share document
                </h2>
                <p className="text-sm text-muted-foreground">
                  Invite a registered Papertrail user by email. They must already
                  have an account.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-email">Email</Label>
                <Input
                  id="share-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-permission">Permission</Label>
                <select
                  id="share-permission"
                  className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  value={permission}
                  disabled={pending}
                  onChange={(e) =>
                    setPermission(e.target.value as "editor" | "viewer")
                  }
                >
                  <option value="viewer">Viewer — read only</option>
                  <option value="editor">Editor — can edit content</option>
                </select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="space-y-2">
                <p className="text-sm font-medium">Collaborators</p>
                {shares.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No one else has access yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {shares.map((share) => (
                      <li
                        key={share.id}
                        className="flex items-center justify-between gap-2 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {share.profile?.display_name ?? "User"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            value={share.permission}
                            disabled={pending}
                            aria-label={`Role for ${share.profile?.display_name}`}
                            onChange={(e) =>
                              handleRoleChange(
                                share.id,
                                e.target.value as "editor" | "viewer",
                              )
                            }
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Revoke ${share.profile?.display_name}`}
                            disabled={pending}
                            onClick={() =>
                              handleRevoke(
                                share.id,
                                share.profile?.display_name ?? "collaborator",
                              )
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={handleInvite}
                disabled={pending || !email.trim()}
              >
                {pending ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
