"use server";

import { getSessionUser } from "@/lib/auth/session";
import {
  createDocument,
  deleteDocument,
  getDocumentWithAccess,
  listAllAccessibleDocuments,
  listOwnedDocuments,
  listSharedWithMe,
  updateDocumentContent,
  updateDocumentTitle,
  type ActionResult,
  type DocumentWithAccess,
} from "@/lib/documents/repository";
import { createClient } from "@/lib/supabase/server";
import type { Document, DocumentListItem } from "@/types/database";
import { revalidatePath } from "next/cache";

async function withAuth<T>(
  fn: (userId: string, supabase: Awaited<ReturnType<typeof createClient>>) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Sign in required", code: "unauthorized" };
  }
  const supabase = await createClient();
  return fn(user.id, supabase);
}

export async function listAllDocumentsAction(
  search?: string,
): Promise<ActionResult<DocumentListItem[]>> {
  return withAuth(async (userId, supabase) => {
    try {
      const documents = await listAllAccessibleDocuments(supabase, userId, search);
      return { ok: true, data: documents };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to load documents",
      };
    }
  });
}

export async function listMyDocumentsAction(
  search?: string,
): Promise<ActionResult<DocumentListItem[]>> {
  return withAuth(async (userId, supabase) => {
    try {
      const documents = await listOwnedDocuments(supabase, userId, search);
      return { ok: true, data: documents };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to load documents",
      };
    }
  });
}

export async function listSharedDocumentsAction(
  search?: string,
): Promise<ActionResult<DocumentListItem[]>> {
  return withAuth(async (userId, supabase) => {
    try {
      const documents = await listSharedWithMe(supabase, userId, search);
      return { ok: true, data: documents };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to load documents",
      };
    }
  });
}

export async function createDocumentAction(): Promise<ActionResult<Document>> {
  const result = await withAuth((userId, supabase) =>
    createDocument(supabase, userId),
  );

  if (result.ok) {
    revalidatePath("/documents");
    revalidatePath("/documents/mine");
  }

  return result;
}

export async function getDocumentWithAccessAction(
  documentId: string,
): Promise<ActionResult<DocumentWithAccess>> {
  return withAuth((userId, supabase) =>
    getDocumentWithAccess(supabase, userId, documentId),
  );
}

export async function renameDocumentAction(
  documentId: string,
  title: string,
): Promise<ActionResult<Document>> {
  const result = await withAuth((userId, supabase) =>
    updateDocumentTitle(supabase, userId, documentId, title),
  );

  if (result.ok) {
    revalidatePath("/documents");
    revalidatePath(`/documents/${documentId}`);
  }

  return result;
}

export async function saveDocumentAction(input: {
  documentId: string;
  title?: string;
  content: unknown;
  expectedUpdatedAt?: string;
}): Promise<ActionResult<Document>> {
  const result = await withAuth((userId, supabase) =>
    updateDocumentContent(
      supabase,
      userId,
      input.documentId,
      input.content,
      input.title,
      input.expectedUpdatedAt,
    ),
  );

  if (result.ok) {
    revalidatePath("/documents");
    revalidatePath(`/documents/${input.documentId}`);
    revalidatePath("/documents/shared");
  }

  return result;
}

export async function deleteDocumentAction(
  documentId: string,
): Promise<ActionResult<{ id: string }>> {
  const result = await withAuth((userId, supabase) =>
    deleteDocument(supabase, userId, documentId),
  );

  if (result.ok) {
    // Only revalidate lists. Revalidating the deleted doc path is wasteful
    // and adds latency to the delete redirect.
    revalidatePath("/documents");
    revalidatePath("/documents/mine");
    revalidatePath("/documents/shared");
  }

  return result;
}
