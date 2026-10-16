import { EMPTY_DOC_CONTENT } from "@/lib/validation/document";

export function plainTextToTiptap(text: string): Record<string, unknown> {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return { ...EMPTY_DOC_CONTENT };
  }

  const paragraphs = normalized.split(/\n{2,}/).map((block) => {
    const lines = block.split("\n");
    const content: Record<string, unknown>[] = lines.flatMap((line, index) => {
      const nodes: Record<string, unknown>[] = [{ type: "text", text: line }];
      if (index < lines.length - 1) {
        nodes.push({ type: "hardBreak" });
      }
      return nodes;
    });
    return { type: "paragraph", content };
  });

  return { type: "doc", content: paragraphs };
}
