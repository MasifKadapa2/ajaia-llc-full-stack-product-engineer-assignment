import { z } from "zod";

export const IMPORT_MAX_BYTES = 1_048_576;

export const importFileSchema = z.object({
  name: z.string().min(1),
  size: z.number().max(IMPORT_MAX_BYTES, "File must be 1 MB or smaller"),
  content: z.string().min(1, "File is empty"),
});

export function getImportKind(filename: string): "txt" | "md" | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".md")) return "md";
  return null;
}

export function validateImportFilename(filename: string): boolean {
  return getImportKind(filename) !== null;
}
