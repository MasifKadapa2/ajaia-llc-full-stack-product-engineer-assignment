import { describe, expect, it } from "vitest";
import { resolveDocumentAccess } from "./access";

const document = {
  id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  title: "Doc",
  content: { type: "doc", content: [] },
  owner_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  created_at: "",
  updated_at: "",
};

describe("resolveDocumentAccess", () => {
  it("grants full control to owner", () => {
    const access = resolveDocumentAccess(document.owner_id, document, null);
    expect(access?.role).toBe("owner");
    expect(access?.canManageShares).toBe(true);
    expect(access?.canRename).toBe(true);
  });

  it("grants editor content access without rename", () => {
    const access = resolveDocumentAccess("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33", document, {
      document_id: document.id,
      shared_with_user_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      permission: "editor",
    });
    expect(access?.canEditContent).toBe(true);
    expect(access?.canRename).toBe(false);
    expect(access?.canManageShares).toBe(false);
  });

  it("grants viewer read-only access", () => {
    const access = resolveDocumentAccess("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33", document, {
      document_id: document.id,
      shared_with_user_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      permission: "viewer",
    });
    expect(access?.canEditContent).toBe(false);
    expect(access?.canRead).toBe(true);
  });
});
