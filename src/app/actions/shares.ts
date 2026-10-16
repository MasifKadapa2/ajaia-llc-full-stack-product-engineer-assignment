"use server";

import { getSessionUser } from "@/lib/auth/session";
import { getDocumentWithAccess } from "@/lib/documents/repository";
import {
  createDocumentShare,
  listDocumentShares,
  revokeDocumentShare,
  updateDocumentSharePermission,
  type ShareRecord,
} from "@/lib/documents/shares-repository";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function withOwnerDocument<T>(
  documentId: string,
  fn: (
    userId: string,
    supabase: Awaited<ReturnType<typeof createClient>>,
    document: Awaited<ReturnType<typeof getDocumentWithAccess>> & { ok: true },
  ) => Promise<T>,
) {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required", code: "unauthorized" as const };
  }

  const supabase = await createClient();
  const docResult = await getDocumentWithAccess(supabase, user.id, documentId);
  if (!docResult.ok) return docResult;
  if (!docResult.data.access.canManageShares) {
    return {
      ok: false as const,
      error: "Only the owner can manage sharing",
      code: "unauthorized" as const,
    };
  }

  return fn(user.id, supabase, docResult as typeof docResult & { ok: true });
}

export async function listSharesAction(documentId: string) {
  return withOwnerDocument(documentId, async (_userId, supabase, docResult) => {
    return listDocumentShares(supabase, docResult.data.document.owner_id, docResult.data.document);
  });
}

export async function createShareAction(input: {
  documentId: string;
  email: string;
  permission: string;
}) {
  const result = await withOwnerDocument(input.documentId, async (userId, supabase, docResult) => {
    return createDocumentShare(
      supabase,
      userId,
      docResult.data.document,
      input.email,
      input.permission,
    );
  });

  if (result.ok) {
    revalidatePath(`/documents/${input.documentId}`);
    revalidatePath("/documents/shared");
    revalidatePath("/documents");
  }

  return result;
}

export async function updateShareAction(input: {
  documentId: string;
  shareId: string;
  permission: string;
}) {
  const result = await withOwnerDocument(input.documentId, async (userId, supabase, docResult) => {
    return updateDocumentSharePermission(
      supabase,
      userId,
      docResult.data.document,
      input.shareId,
      input.permission,
    );
  });

  if (result.ok) {
    revalidatePath(`/documents/${input.documentId}`);
    revalidatePath("/documents/shared");
  }

  return result;
}

export async function revokeShareAction(input: {
  documentId: string;
  shareId: string;
}) {
  const result = await withOwnerDocument(input.documentId, async (userId, supabase, docResult) => {
    return revokeDocumentShare(
      supabase,
      userId,
      docResult.data.document,
      input.shareId,
    );
  });

  if (result.ok) {
    revalidatePath(`/documents/${input.documentId}`);
    revalidatePath("/documents/shared");
    revalidatePath("/documents");
  }

  return result;
}

export type { ShareRecord };
