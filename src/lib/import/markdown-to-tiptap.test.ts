import { describe, expect, it } from "vitest";
import { markdownToTiptap } from "./markdown-to-tiptap";

describe("markdownToTiptap", () => {
  it("converts headings and lists", () => {
    const doc = markdownToTiptap("# Title\n\n- one\n- two");
    expect(doc.type).toBe("doc");
    const content = doc.content as { type: string }[];
    expect(content[0]?.type).toBe("heading");
    expect(content.some((n) => n.type === "bulletList")).toBe(true);
  });

  it("supports bold and italic inline marks", () => {
    const doc = markdownToTiptap("**bold** and *italic*");
    const paragraph = (doc.content as { content?: { marks?: { type: string }[] }[] }[])[0];
    const marks = paragraph?.content?.flatMap((n) => n.marks ?? []) ?? [];
    expect(marks.some((m) => m.type === "bold")).toBe(true);
    expect(marks.some((m) => m.type === "italic")).toBe(true);
  });
});
