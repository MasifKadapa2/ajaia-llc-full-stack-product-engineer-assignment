import { describe, expect, it } from "vitest";
import {
  canDeleteDocument,
  canEditDocument,
  canManageShares,
  canReadDocument,
  canRenameDocument,
} from "./permissions";

const document = { id: "doc-1", owner_id: "owner-1" };

describe("document permissions (V1 owner-only)", () => {
  it("allows owner read and edit", () => {
    expect(canReadDocument("owner-1", document)).toBe(true);
    expect(canEditDocument("owner-1", document)).toBe(true);
  });

  it("denies non-owner read and edit without shares", () => {
    expect(canReadDocument("other-user", document)).toBe(false);
    expect(canEditDocument("other-user", document)).toBe(false);
    expect(canRenameDocument("other-user", document)).toBe(false);
    expect(canManageShares("other-user", document)).toBe(false);
    expect(canDeleteDocument("other-user", document)).toBe(false);
  });

  it("allows shared viewer read but not edit (V2 seam)", () => {
    const shares = [
      {
        document_id: "doc-1",
        shared_with_user_id: "viewer-1",
        permission: "viewer" as const,
      },
    ];
    expect(canReadDocument("viewer-1", document, shares)).toBe(true);
    expect(canEditDocument("viewer-1", document, shares)).toBe(false);
  });

  it("allows shared editor read and edit (V2 seam)", () => {
    const shares = [
      {
        document_id: "doc-1",
        shared_with_user_id: "editor-1",
        permission: "editor" as const,
      },
    ];
    expect(canReadDocument("editor-1", document, shares)).toBe(true);
    expect(canEditDocument("editor-1", document, shares)).toBe(true);
  });
});
