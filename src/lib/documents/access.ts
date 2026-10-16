import type { Document } from "@/types/database";
import type { DocumentShare, SharePermission } from "./permissions";

export type DocumentRole = "owner" | "editor" | "viewer";

export type DocumentAccess = {
  role: DocumentRole;
  canRead: boolean;
  canEditContent: boolean;
  canRename: boolean;
  canDelete: boolean;
  canManageShares: boolean;
};

export function resolveDocumentAccess(
  userId: string,
  document: Document,
  share: DocumentShare | null,
): DocumentAccess | null {
  if (document.owner_id === userId) {
    return {
      role: "owner",
      canRead: true,
      canEditContent: true,
      canRename: true,
      canDelete: true,
      canManageShares: true,
    };
  }

  if (!share || share.document_id !== document.id) {
    return null;
  }

  if (share.shared_with_user_id !== userId) {
    return null;
  }

  if (share.permission === "editor") {
    return {
      role: "editor",
      canRead: true,
      canEditContent: true,
      canRename: false,
      canDelete: false,
      canManageShares: false,
    };
  }

  if (share.permission === "viewer") {
    return {
      role: "viewer",
      canRead: true,
      canEditContent: false,
      canRename: false,
      canDelete: false,
      canManageShares: false,
    };
  }

  return null;
}

export function isSharePermission(value: string): value is SharePermission {
  return value === "editor" || value === "viewer";
}
