import { describe, expect, it } from "vitest";
import {
  EMPTY_DOC_CONTENT,
  documentTitleSchema,
  normalizeDocumentContent,
  normalizeDocumentTitle,
} from "./document";

describe("documentTitleSchema", () => {
  it("trims and accepts valid titles", () => {
    expect(normalizeDocumentTitle("  Hello  ")).toBe("Hello");
  });

  it("rejects empty titles", () => {
    expect(documentTitleSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects titles over 200 characters", () => {
    expect(documentTitleSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("normalizeDocumentContent", () => {
  it("returns empty doc for invalid content", () => {
    expect(normalizeDocumentContent(null)).toEqual(EMPTY_DOC_CONTENT);
    expect(normalizeDocumentContent({ type: "paragraph" })).toEqual(
      EMPTY_DOC_CONTENT,
    );
  });

  it("preserves valid tiptap doc json", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hi" }],
        },
      ],
    };
    expect(normalizeDocumentContent(doc)).toEqual(doc);
  });
});
