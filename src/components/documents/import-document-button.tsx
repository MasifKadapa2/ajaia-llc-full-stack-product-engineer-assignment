"use client";

import { importDocumentAction } from "@/app/actions/import";
import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/toast";
import { IMPORT_MAX_BYTES } from "@/lib/validation/import";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ImportDocumentButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  function handlePick() {
    setError(null);
    inputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > IMPORT_MAX_BYTES) {
      const message = "File must be 1 MB or smaller.";
      setError(message);
      appToast.error("Import failed", message);
      return;
    }

    if (pending) return;
    setPending(true);
    try {
      const text = await file.text();
      const result = await importDocumentAction({
        filename: file.name,
        content: text,
      });

      if (result.ok) {
        appToast.success("Document imported", result.data.title);
        router.push(`/documents/${result.data.id}`);
      } else {
        setError(result.error);
        appToast.error("Import failed", result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="sr-only"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={handlePick}
        disabled={pending}
        title="Import a .txt or .md file (max 1 MB)"
      >
        <FileUp className="size-4" aria-hidden />
        {pending ? "Importing…" : "Import Document"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Supports .txt, .md files · max 1 MB
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
