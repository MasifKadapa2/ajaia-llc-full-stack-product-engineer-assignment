import { describe, expect, it, vi } from "vitest";
import {
  createDocument,
  deleteDocument,
  getDocumentForUser,
  updateDocumentTitle,
} from "./repository";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(handlers: {
  selectDocument?: () => unknown;
  insertDocument?: () => unknown;
  updateDocument?: () => unknown;
}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  chain.single.mockImplementation(() => ({
    data: handlers.insertDocument?.() ?? handlers.updateDocument?.(),
    error: null,
  }));

  chain.maybeSingle.mockImplementation(() => ({
    data: handlers.selectDocument?.(),
    error: null,
  }));

  const from = vi.fn(() => chain);

  return {
    supabase: { from } as unknown as SupabaseClient,
    chain,
  };
}

const ownerId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const docId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
const otherUserId = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

describe("repository document access", () => {
  it("returns unauthorized for non-owner on fetch", async () => {
    const doc = {
      id: docId,
      title: "Secret",
      content: { type: "doc", content: [] },
      owner_id: ownerId,
      created_at: "",
      updated_at: "",
    };

    const { supabase } = createMockSupabase({
      selectDocument: () => doc,
    });

    const result = await getDocumentForUser(
      supabase,
      otherUserId,
      docId,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unauthorized");
    }
  });

  it("creates document with owner from server context", async () => {
    const created = {
      id: docId,
      title: "Untitled",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      owner_id: ownerId,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    };

    const { supabase, chain } = createMockSupabase({
      insertDocument: () => created,
    });

    const result = await createDocument(supabase, ownerId);

    expect(result.ok).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: ownerId }),
    );
  });

  it("validates title on rename", async () => {
    const doc = {
      id: docId,
      title: "Old",
      content: { type: "doc", content: [] },
      owner_id: ownerId,
      created_at: "",
      updated_at: "",
    };

    const { supabase } = createMockSupabase({
      selectDocument: () => doc,
      updateDocument: () => doc,
    });

    const result = await updateDocumentTitle(supabase, ownerId, docId, "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation");
    }
  });

  it("rejects delete for non-owner", async () => {
    const doc = {
      id: docId,
      title: "Keep",
      content: { type: "doc", content: [] },
      owner_id: ownerId,
      created_at: "",
      updated_at: "",
    };

    const { supabase } = createMockSupabase({
      selectDocument: () => doc,
    });

    const result = await deleteDocument(supabase, otherUserId, docId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unauthorized");
    }
  });

  it("allows owner to delete document", async () => {
    const doc = {
      id: docId,
      title: "Gone",
      content: { type: "doc", content: [] },
      owner_id: ownerId,
      created_at: "",
      updated_at: "",
    };

    const { supabase, chain } = createMockSupabase({
      selectDocument: () => doc,
    });

    chain.maybeSingle.mockImplementationOnce(() => ({
      data: doc,
      error: null,
    }));

    chain.maybeSingle.mockImplementation(() => ({
      data: { id: docId },
      error: null,
    }));

    const result = await deleteDocument(supabase, ownerId, docId);
    expect(result.ok).toBe(true);
    expect(chain.delete).toHaveBeenCalled();
  });
});
