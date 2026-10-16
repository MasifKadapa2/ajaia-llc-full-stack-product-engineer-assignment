import { marked } from "marked";
import { EMPTY_DOC_CONTENT } from "@/lib/validation/document";

type TiptapNode = Record<string, unknown>;

function textNode(text: string, marks?: { type: string }[]): TiptapNode {
  const node: TiptapNode = { type: "text", text };
  if (marks?.length) node.marks = marks;
  return node;
}

function paragraph(children: TiptapNode[]): TiptapNode {
  return { type: "paragraph", content: children.length ? children : undefined };
}

type MarkedToken = {
  type: string;
  text?: string;
  depth?: number;
  href?: string;
  ordered?: boolean;
  items?: MarkedToken[];
  tokens?: MarkedToken[];
};

function inlineTokens(tokens: MarkedToken[]): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  for (const token of tokens) {
    if (token.type === "text" && token.text) {
      nodes.push(textNode(token.text));
    } else if (token.type === "strong" && token.text) {
      nodes.push(
        textNode(token.text, [{ type: "bold" }]),
      );
    } else if (token.type === "em" && token.text) {
      nodes.push(textNode(token.text, [{ type: "italic" }]));
    } else if (token.type === "link" && token.text && token.href) {
      nodes.push({
        type: "text",
        text: token.text,
        marks: [{ type: "link", attrs: { href: token.href, target: "_blank" } }],
      });
    } else if (token.type === "codespan" && token.text) {
      nodes.push(textNode(token.text));
    } else if ("text" in token && typeof token.text === "string") {
      nodes.push(textNode(token.text));
    }
  }
  return nodes;
}

function blockTokens(tokens: MarkedToken[]): TiptapNode[] {
  const content: TiptapNode[] = [];

  for (const token of tokens) {
    if (token.type === "heading") {
      content.push({
        type: "heading",
        attrs: { level: Math.min(2, Number(token.depth) || 1) },
        content: inlineTokens(token.tokens ?? []),
      });
    } else if (token.type === "paragraph") {
      content.push(paragraph(inlineTokens(token.tokens ?? [])));
    } else if (token.type === "list") {
      const listType = token.ordered ? "orderedList" : "bulletList";
      content.push({
        type: listType,
        content: (token.items ?? []).map((item) => ({
          type: "listItem",
          content: blockTokens(item.tokens ?? []),
        })),
      });
    } else if (token.type === "blockquote") {
      for (const inner of blockTokens(token.tokens ?? [])) {
        content.push(inner);
      }
    } else if (token.type === "space") {
      continue;
    } else if (token.type === "html") {
      continue;
    } else if (token.type === "text") {
      const text = token.text ?? "";
      if (text.trim()) {
        content.push(paragraph([textNode(text)]));
      }
    }
  }

  return content;
}

export function markdownToTiptap(markdown: string): Record<string, unknown> {
  const tokens = marked.lexer(markdown, { gfm: true }) as MarkedToken[];
  const content = blockTokens(tokens);
  if (content.length === 0) {
    return { ...EMPTY_DOC_CONTENT };
  }
  return { type: "doc", content };
}
