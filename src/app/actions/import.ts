"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createDocument } from "@/lib/documents/repository";
import { markdownToTiptap } from "@/lib/import/markdown-to-tiptap";
import { plainTextToTiptap } from "@/lib/import/plain-text-to-tiptap";
import {
  getImportKind,
  importFileSchema,
  validateImportFilename,
} from "@/lib/validation/import";
import { documentTitleSchema } from "@/lib/validation/document";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function importDocumentAction(input: {
  filename: string;
  content: string;
}) {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required", code: "unauthorized" as const };
  }

  if (!validateImportFilename(input.filename)) {
    return {
      ok: false as const,
      error: "Only .txt and .md files are supported",
      code: "validation" as const,
    };
  }

  const parsed = importFileSchema.safeParse({
    name: input.filename,
    size: new TextEncoder().encode(input.content).byteLength,
    content: input.content,
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid file",
      code: "validation" as const,
    };
  }

  const kind = getImportKind(input.filename);
  if (!kind) {
    return {
      ok: false as const,
      error: "Unsupported file type",
      code: "validation" as const,
    };
  }

  const baseName = input.filename.replace(/\.(txt|md)$/i, "").trim() || "Imported document";
  const titleResult = documentTitleSchema.safeParse(baseName);
  const title = titleResult.success ? titleResult.data : "Imported document";

  const tiptapContent =
    kind === "md"
      ? markdownToTiptap(parsed.data.content)
      : plainTextToTiptap(parsed.data.content);

  const supabase = await createClient();
  const result = await createDocument(supabase, user.id, title, tiptapContent);

  if (result.ok) {
    revalidatePath("/documents");
    revalidatePath("/documents/mine");
  }

  return result;
}
