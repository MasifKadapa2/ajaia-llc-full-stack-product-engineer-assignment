import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseDocumentId } from "@/lib/validation/document";
import { canManageShares } from "./permissions";
import type { ActionResult } from "./repository";
import type { Document } from "@/types/database";
import { isSharePermission } from "./access";

export type ShareRecord = {
  id: string;
  document_id: string;
  shared_with_user_id: string;
  permission: "editor" | "viewer";
  created_at: string;
  updated_at: string;
  profile?: { id: string; display_name: string };
};

const shareEmailSchema = z.string().trim().email("Enter a valid email address");

const sharePermissionSchema = z.enum(["editor", "viewer"]);

export async function listDocumentShares(
  supabase: SupabaseClient,
  userId: string,
  document: Document,
): Promise<ActionResult<ShareRecord[]>> {
  if (!canManageShares(userId, document)) {
    return { ok: false, error: "Only the owner can view collaborators", code: "unauthorized" };
  }

  const { data, error } = await supabase
    .from("document_shares")
    .select("*")
    .eq("document_id", document.id)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const shares = (data ?? []) as ShareRecord[];
  const profileIds = [...new Set(shares.map((s) => s.shared_with_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", profileIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { id: string; display_name: string }]),
  );

  return {
    ok: true,
    data: shares.map((share) => ({
      ...share,
      profile: profileMap.get(share.shared_with_user_id),
    })),
  };
}

export async function lookupUserByEmailForDocument(
  supabase: SupabaseClient,
  documentId: string,
  rawEmail: string,
): Promise<ActionResult<{ id: string; display_name: string }>> {
  const parsed = shareEmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid email",
      code: "validation",
    };
  }

  const { data, error } = await supabase.rpc(
    "lookup_profile_by_email_for_document_share",
    {
      doc_id: documentId,
      target_email: parsed.data,
    },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    return {
      ok: false,
      error: "No registered user found with that email",
      code: "not_found",
    };
  }

  return { ok: true, data: row as { id: string; display_name: string } };
}

export async function createDocumentShare(
  supabase: SupabaseClient,
  userId: string,
  document: Document,
  rawEmail: string,
  rawPermission: string,
): Promise<ActionResult<ShareRecord>> {
  if (!canManageShares(userId, document)) {
    return { ok: false, error: "Only the owner can share this document", code: "unauthorized" };
  }

  const permissionResult = sharePermissionSchema.safeParse(rawPermission);
  if (!permissionResult.success) {
    return { ok: false, error: "Invalid permission", code: "validation" };
  }

  const recipient = await lookupUserByEmailForDocument(supabase, document.id, rawEmail);
  if (!recipient.ok) return recipient;

  if (recipient.data.id === userId) {
    return { ok: false, error: "You cannot share a document with yourself", code: "validation" };
  }

  const { data, error } = await supabase
    .from("document_shares")
    .insert({
      document_id: document.id,
      shared_with_user_id: recipient.data.id,
      permission: permissionResult.data,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "This person already has access to the document",
        code: "validation",
      };
    }
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: {
      ...(data as ShareRecord),
      profile: {
        id: recipient.data.id,
        display_name: recipient.data.display_name,
      },
    },
  };
}

export async function updateDocumentSharePermission(
  supabase: SupabaseClient,
  userId: string,
  document: Document,
  shareId: string,
  rawPermission: string,
): Promise<ActionResult<ShareRecord>> {
  if (!canManageShares(userId, document)) {
    return { ok: false, error: "Only the owner can change roles", code: "unauthorized" };
  }

  if (!isSharePermission(rawPermission)) {
    return { ok: false, error: "Invalid permission", code: "validation" };
  }

  const { data, error } = await supabase
    .from("document_shares")
    .update({ permission: rawPermission })
    .eq("id", shareId)
    .eq("document_id", document.id)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Share not found", code: "not_found" };
  }

  return { ok: true, data: data as ShareRecord };
}

export async function revokeDocumentShare(
  supabase: SupabaseClient,
  userId: string,
  document: Document,
  shareId: string,
): Promise<ActionResult<{ id: string }>> {
  if (!canManageShares(userId, document)) {
    return { ok: false, error: "Only the owner can revoke access", code: "unauthorized" };
  }

  const { error } = await supabase
    .from("document_shares")
    .delete()
    .eq("id", shareId)
    .eq("document_id", document.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: { id: shareId } };
}

export async function getShareForUserOnDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<ShareRecord | null> {
  try {
    parseDocumentId(documentId);
  } catch {
    return null;
  }

  const { data } = await supabase
    .from("document_shares")
    .select("*")
    .eq("document_id", documentId)
    .eq("shared_with_user_id", userId)
    .maybeSingle();

  return (data as ShareRecord | null) ?? null;
}
