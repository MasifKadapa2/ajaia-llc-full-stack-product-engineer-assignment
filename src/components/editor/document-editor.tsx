"use client";

import { saveDocumentAction } from "@/app/actions/documents";
import { ShareDocumentDialog } from "@/components/sharing/share-document-dialog";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import type { DocumentAccess } from "@/lib/documents/access";
import { appToast } from "@/lib/toast";
import { normalizeDocumentContent } from "@/lib/validation/document";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saved" | "error";

type DocumentEditorProps = {
  documentId: string;
  initialTitle: string;
  initialContent: Record<string, unknown>;
  serverUpdatedAt: string;
  access: DocumentAccess;
};

const AUTOSAVE_MS = 800;

export function DocumentEditor(props: DocumentEditorProps) {
  return <DocumentEditorInner key={props.documentId} {...props} />;
}

function DocumentEditorInner({
  documentId,
  initialTitle,
  initialContent,
  serverUpdatedAt,
  access,
}: DocumentEditorProps) {
  const readOnly = !access.canEditContent;
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    readOnly ? "idle" : "saved",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inaccessible, setInaccessible] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(serverUpdatedAt);
  const updatedAtRef = useRef(serverUpdatedAt);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

  const latestPayloadRef = useRef({
    title: initialTitle,
    content: normalizeDocumentContent(initialContent),
  });
  const saveGenerationRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveToastRef = useRef<string | null>(null);
  const debouncePendingRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const lastSavedSnapshotRef = useRef(
    JSON.stringify({
      title: initialTitle,
      content: normalizeDocumentContent(initialContent),
    }),
  );

  const syncSaveStatus = useCallback(() => {
    if (readOnly) return;
    if (saveInFlightRef.current) {
      setSaveStatus("pending");
      return;
    }
    const snapshot = JSON.stringify(latestPayloadRef.current);
    if (debouncePendingRef.current || snapshot !== lastSavedSnapshotRef.current) {
      setHasUnsavedEdits(true);
      setSaveStatus("idle");
      return;
    }
    setHasUnsavedEdits(false);
    setSaveStatus("saved");
  }, [readOnly]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      Placeholder.configure({
        placeholder: readOnly ? "This document is read-only." : "Start writing…",
      }),
    ],
    content: normalizeDocumentContent(initialContent),
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral max-w-none min-h-[50vh] focus:outline-none px-1 py-2",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (readOnly) return;
      scheduleSave(
        ed.getJSON() as Record<string, unknown>,
        latestPayloadRef.current.title,
      );
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const persist = useCallback(
    async (payload: { title: string; content: unknown }) => {
      const snapshot = JSON.stringify(payload);
      if (snapshot === lastSavedSnapshotRef.current) {
        saveInFlightRef.current = false;
        syncSaveStatus();
        return;
      }

      const generation = ++saveGenerationRef.current;
      saveInFlightRef.current = true;
      syncSaveStatus();
      setSaveError(null);

      const result = await saveDocumentAction({
        documentId,
        title: access.canRename ? payload.title : undefined,
        content: payload.content,
        expectedUpdatedAt: updatedAtRef.current,
      });

      if (generation !== saveGenerationRef.current) {
        return;
      }

      saveInFlightRef.current = false;

      if (!result.ok) {
        setSaveStatus("error");
        setSaveError(result.error);
        if (result.code === "not_found" || result.code === "unauthorized") {
          setInaccessible(true);
        }
        const toastKey = `${result.code ?? "error"}:${result.error}`;
        if (lastSaveToastRef.current !== toastKey) {
          lastSaveToastRef.current = toastKey;
          if (result.code === "conflict") {
            appToast.error("Newer version available", result.error);
          } else if (
            result.code === "not_found" ||
            result.code === "unauthorized"
          ) {
            appToast.error("Cannot save changes", result.error);
          } else {
            appToast.error("Save failed", result.error);
          }
        }
        return;
      }

      lastSaveToastRef.current = null;
      lastSavedSnapshotRef.current = snapshot;
      updatedAtRef.current = result.data.updated_at;
      setUpdatedAt(result.data.updated_at);
      setHasUnsavedEdits(false);
      setSaveStatus("saved");
    },
    [documentId, syncSaveStatus, access.canRename],
  );

  const scheduleSave = useCallback(
    (content: Record<string, unknown>, nextTitle: string) => {
      latestPayloadRef.current = { title: nextTitle, content };
      debouncePendingRef.current = true;
      syncSaveStatus();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debouncePendingRef.current = false;
        void persist(latestPayloadRef.current);
      }, AUTOSAVE_MS);
    },
    [persist, syncSaveStatus],
  );

  const flushSave = useCallback(() => {
    if (readOnly) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debouncePendingRef.current = false;
    void persist(latestPayloadRef.current);
  }, [persist, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const snapshot = JSON.stringify(latestPayloadRef.current);
      if (snapshot !== lastSavedSnapshotRef.current || debouncePendingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [readOnly]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleTitleChange(value: string) {
    if (!access.canRename) return;
    setTitle(value);
    latestPayloadRef.current = {
      ...latestPayloadRef.current,
      title: value,
    };
    scheduleSave(
      (editor?.getJSON() as Record<string, unknown> | undefined) ??
        latestPayloadRef.current.content,
      value,
    );
  }

  function handleTitleBlur() {
    flushSave();
  }

  const statusLabel = readOnly
    ? ""
    : saveStatus === "pending"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : hasUnsavedEdits
            ? "Unsaved changes"
            : "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/documents"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All documents
        </Link>
        <div className="flex items-center gap-3">
          {readOnly && (
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
              Read-only ({access.role})
            </span>
          )}
          {access.canDelete && (
            <DeleteDocumentDialog documentId={documentId} documentTitle={title} />
          )}
          {access.canManageShares && (
            <ShareDocumentDialog documentId={documentId} />
          )}
          {!readOnly && statusLabel && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span
                aria-live="polite"
                className={
                  saveStatus === "error" ? "text-destructive font-medium" : ""
                }
              >
                {statusLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {saveError && !readOnly && (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {inaccessible && (
        <Alert variant="destructive">
          <AlertDescription>
            This document is no longer available.{" "}
            <Link href="/documents" className="underline">
              Return to your documents
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <Input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        onBlur={handleTitleBlur}
        disabled={inaccessible || !access.canRename}
        readOnly={!access.canRename}
        className="border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
        aria-label="Document title"
      />

      {!readOnly && <EditorToolbar editor={editor} />}

      <div
        className={`rounded-lg border border-border/60 bg-background px-6 py-4 shadow-sm ${
          readOnly ? "pointer-events-none select-text opacity-90" : ""
        }`}
        aria-readonly={readOnly}
        onBlur={(e) => {
          if (!readOnly && !e.currentTarget.contains(e.relatedTarget as Node)) {
            flushSave();
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
