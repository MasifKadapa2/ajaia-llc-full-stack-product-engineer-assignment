import { z } from "zod";

export const TITLE_MAX_LENGTH = 200;
export const CONTENT_MAX_BYTES = 512_000;

const uuidSchema = z.string().uuid();

export const documentIdSchema = uuidSchema;

export const documentTitleSchema = z
  .string()
  .trim()
  .min(1, "Title cannot be empty")
  .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters`);

export const tiptapDocSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export const documentContentSchema = z
  .unknown()
  .refine((value) => {
    const parsed = tiptapDocSchema.safeParse(value);
    return parsed.success;
  }, "Invalid document content")
  .refine((value) => {
    const serialized = JSON.stringify(value);
    return new TextEncoder().encode(serialized).length <= CONTENT_MAX_BYTES;
  }, "Document content is too large");

export function normalizeDocumentTitle(raw: string): string {
  return documentTitleSchema.parse(raw);
}

export function parseDocumentId(raw: string): string {
  return documentIdSchema.parse(raw);
}

export const EMPTY_DOC_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

export function normalizeDocumentContent(
  raw: unknown,
): Record<string, unknown> {
  const result = documentContentSchema.safeParse(raw);
  if (result.success) {
    return result.data as Record<string, unknown>;
  }
  return { ...EMPTY_DOC_CONTENT };
}
