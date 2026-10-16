import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMPTY_DOC_CONTENT,
  documentContentSchema,
  documentTitleSchema,
  normalizeDocumentContent,
  parseDocumentId,
} from "@/lib/validation/document";
import type { Document, DocumentListItem } from "@/types/database";
import { resolveDocumentAccess, type DocumentAccess } from "./access";
import { canReadDocument, canRenameDocument } from "./permissions";
import { getShareForUserOnDocument } from "./shares-repository";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: "unauthorized" | "not_found" | "validation" | "conflict" };

export type DocumentWithAccess = {
  document: Document;
  access: DocumentAccess;
};

function mapDocument(row: Document): Document {
  return {
    ...row,
    content: normalizeDocumentContent(row.content),
  };
}

function mapListItem(
  row: Document,
  extras: Partial<DocumentListItem>,
): DocumentListItem {
  return {
    ...mapDocument(row),
    ...extras,
  };
}

export async function listOwnedDocuments(
  supabase: SupabaseClient,
  userId: string,
  search?: string,
): Promise<DocumentListItem[]> {
  let query = supabase
    .from("documents")
    .select("id,title,owner_id,updated_at,created_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (search?.trim()) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapListItem(
      { ...(row as object), content: EMPTY_DOC_CONTENT } as unknown as Document,
      {
        accessRole: "owner",
        accessLabel: "Owner",
      },
    ),
  );
}

export async function listSharedWithMe(
  supabase: SupabaseClient,
  userId: string,
  search?: string,
): Promise<DocumentListItem[]> {
  const { data: shares, error: shareError } = await supabase
    .from("document_shares")
    .select("permission, document:documents(id,title,owner_id,updated_at,created_at)")
    .eq("shared_with_user_id", userId)
    .limit(100);

  if (shareError) {
    throw new Error(shareError.message);
  }

  const docs = (shares ?? [])
    .map((row) => ({
      permission: row.permission as DocumentListItem["accessRole"],
      doc: row.document as unknown as Omit<Document, "content"> | null,
    }))
    .filter((r): r is { permission: DocumentListItem["accessRole"]; doc: Omit<Document, "content"> } => !!r.doc)
    .filter((r) => !search?.trim() || r.doc.title.toLowerCase().includes(search.trim().toLowerCase()));

  if (docs.length === 0) return [];

  const ownerIds = [...new Set(docs.map((r) => r.doc.owner_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ownerIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const items = docs.map(({ permission, doc }) =>
    mapListItem({ ...doc, content: EMPTY_DOC_CONTENT } as unknown as Document, {
      owner: profileMap.get(doc.owner_id) as DocumentListItem["owner"],
      accessRole: permission,
      accessLabel: permission === "editor" ? "Editor" : "Viewer",
    }),
  );

  items.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return items;
}

export async function listAllAccessibleDocuments(
  supabase: SupabaseClient,
  userId: string,
  search?: string,
): Promise<DocumentListItem[]> {
  let query = supabase
    .from("documents")
    .select("id,title,owner_id,updated_at,created_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (search?.trim()) {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const [{ data, error }, { data: myShares }] = await Promise.all([
    query,
    supabase
      .from("document_shares")
      .select("document_id,permission")
      .eq("shared_with_user_id", userId),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const shareMap = new Map(
    (myShares ?? []).map((s) => [s.document_id as string, s.permission as DocumentListItem["accessRole"]]),
  );

  const rows = (data ?? []) as unknown as Omit<Document, "content">[];
  // RLS already restricts to owned + shared, but keep client-side guard
  const visible = rows.filter((row) => row.owner_id === userId || shareMap.has(row.id));
  if (visible.length === 0) return [];

  const profileIds = [...new Set(visible.map((r) => r.owner_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", profileIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { id: string; display_name: string }]),
  );

  return visible.map((row) => {
    const doc = { ...row, content: EMPTY_DOC_CONTENT } as unknown as Document;
    if (doc.owner_id === userId) {
      return mapListItem(doc, {
        owner: profileMap.get(userId),
        accessRole: "owner",
        accessLabel: "Owner",
      });
    }
    const permission = shareMap.get(doc.id) ?? "viewer";
    return mapListItem(doc, {
      owner: profileMap.get(doc.owner_id),
      accessRole: permission,
      accessLabel: permission === "editor" ? "Editor" : "Viewer",
    });
  });
}

export async function getDocumentWithAccess(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<ActionResult<DocumentWithAccess>> {
  try {
    parseDocumentId(documentId);
  } catch {
    return { ok: false, error: "Invalid document id", code: "validation" };
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Document not found", code: "not_found" };
  }

  const document = mapDocument(data as Document);
  const share =
    document.owner_id === userId
      ? null
      : await getShareForUserOnDocument(supabase, userId, documentId);

  const shareForPerm = share
    ? [
        {
          document_id: share.document_id,
          shared_with_user_id: share.shared_with_user_id,
          permission: share.permission,
        },
      ]
    : [];

  if (!canReadDocument(userId, document, shareForPerm)) {
    return { ok: false, error: "You do not have access to this document", code: "unauthorized" };
  }

  const access = resolveDocumentAccess(userId, document, share);
  if (!access) {
    return { ok: false, error: "You do not have access to this document", code: "unauthorized" };
  }

  return { ok: true, data: { document, access } };
}

/** @deprecated use getDocumentWithAccess */
export async function getDocumentForUser(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<ActionResult<Document>> {
  const result = await getDocumentWithAccess(supabase, userId, documentId);
  if (!result.ok) return result;
  return { ok: true, data: result.data.document };
}

export async function createDocument(
  supabase: SupabaseClient,
  userId: string,
  title?: string,
  content?: Record<string, unknown>,
): Promise<ActionResult<Document>> {
  const parsedTitle = documentTitleSchema.safeParse(title ?? "Untitled");
  const finalTitle = parsedTitle.success ? parsedTitle.data : "Untitled";
  const finalContent = content
    ? normalizeDocumentContent(content)
    : EMPTY_DOC_CONTENT;

  const contentResult = documentContentSchema.safeParse(finalContent);
  if (!contentResult.success) {
    return { ok: false, error: "Invalid document content", code: "validation" };
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: finalTitle,
      content: contentResult.data,
      owner_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: mapDocument(data as Document) };
}

export async function updateDocumentTitle(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  rawTitle: string,
): Promise<ActionResult<Document>> {
  const titleResult = documentTitleSchema.safeParse(rawTitle);
  if (!titleResult.success) {
    return {
      ok: false,
      error: titleResult.error.issues[0]?.message ?? "Invalid title",
      code: "validation",
    };
  }

  const accessResult = await getDocumentWithAccess(supabase, userId, documentId);
  if (!accessResult.ok) return accessResult;
  if (!canRenameDocument(userId, accessResult.data.document)) {
    return { ok: false, error: "Only the owner can rename this document", code: "unauthorized" };
  }

  const { data, error } = await supabase
    .from("documents")
    .update({ title: titleResult.data })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Document not found", code: "not_found" };
  }

  return { ok: true, data: mapDocument(data as Document) };
}

export async function updateDocumentContent(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  rawContent: unknown,
  rawTitle?: string,
  expectedUpdatedAt?: string,
): Promise<ActionResult<Document>> {
  const contentResult = documentContentSchema.safeParse(rawContent);
  if (!contentResult.success) {
    return {
      ok: false,
      error: contentResult.error.issues[0]?.message ?? "Invalid content",
      code: "validation",
    };
  }

  const accessResult = await getDocumentWithAccess(supabase, userId, documentId);
  if (!accessResult.ok) return accessResult;

  const { document, access } = accessResult.data;

  if (!access.canEditContent) {
    return { ok: false, error: "You cannot edit this document", code: "unauthorized" };
  }

  const updates: { content: unknown; title?: string } = {
    content: contentResult.data,
  };

  if (access.canRename && rawTitle !== undefined) {
    const titleResult = documentTitleSchema.safeParse(rawTitle);
    if (!titleResult.success) {
      return {
        ok: false,
        error: titleResult.error.issues[0]?.message ?? "Invalid title",
        code: "validation",
      };
    }
    updates.title = titleResult.data;
  } else if (rawTitle !== undefined) {
    const titleResult = documentTitleSchema.safeParse(rawTitle);
    if (titleResult.success && titleResult.data !== document.title) {
      return {
        ok: false,
        error: "Only the owner can rename this document",
        code: "unauthorized",
      };
    }
  }

  if (expectedUpdatedAt && expectedUpdatedAt !== document.updated_at) {
    return {
      ok: false,
      error: "This document was updated elsewhere. Refresh to get the latest version.",
      code: "conflict",
    };
  }

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", documentId)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Document not found", code: "not_found" };
  }

  return { ok: true, data: mapDocument(data as Document) };
}

export async function deleteDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    parseDocumentId(documentId);
  } catch {
    return { ok: false, error: "Invalid document id", code: "validation" };
  }

  const accessResult = await getDocumentWithAccess(supabase, userId, documentId);
  if (!accessResult.ok) return accessResult;

  if (!accessResult.data.access.canDelete) {
    return {
      ok: false,
      error: "Only the owner can delete this document",
      code: "unauthorized",
    };
  }

  const { data, error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return {
      ok: false,
      error: "Document not found or could not be deleted",
      code: "not_found",
    };
  }

  return { ok: true, data: { id: data.id as string } };
}
