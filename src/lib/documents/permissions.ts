export type DocumentRecord = {
  id: string;
  owner_id: string;
};

export type SharePermission = "editor" | "viewer";

export type DocumentShare = {
  document_id: string;
  shared_with_user_id: string;
  permission: SharePermission;
};

/**
 * V1: only the owner may read or edit. V2 will honor document_shares.
 */
export function canReadDocument(
  userId: string | null | undefined,
  document: DocumentRecord,
  shares: DocumentShare[] = [],
): boolean {
  if (!userId) return false;
  if (document.owner_id === userId) return true;
  return shares.some(
    (s) =>
      s.document_id === document.id &&
      s.shared_with_user_id === userId &&
      (s.permission === "viewer" || s.permission === "editor"),
  );
}

export function canEditDocument(
  userId: string | null | undefined,
  document: DocumentRecord,
  shares: DocumentShare[] = [],
): boolean {
  if (!userId) return false;
  if (document.owner_id === userId) return true;
  return shares.some(
    (s) =>
      s.document_id === document.id &&
      s.shared_with_user_id === userId &&
      s.permission === "editor",
  );
}

export function canRenameDocument(
  userId: string | null | undefined,
  document: DocumentRecord,
): boolean {
  if (!userId) return false;
  return document.owner_id === userId;
}

export function canManageShares(
  userId: string | null | undefined,
  document: DocumentRecord,
): boolean {
  if (!userId) return false;
  return document.owner_id === userId;
}

export function canDeleteDocument(
  userId: string | null | undefined,
  document: DocumentRecord,
): boolean {
  if (!userId) return false;
  return document.owner_id === userId;
}
