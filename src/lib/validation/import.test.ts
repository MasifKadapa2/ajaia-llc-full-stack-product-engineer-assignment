import { describe, expect, it } from "vitest";
import { getImportKind, importFileSchema, validateImportFilename } from "./import";

describe("import validation", () => {
  it("accepts txt and md extensions", () => {
    expect(getImportKind("notes.txt")).toBe("txt");
    expect(getImportKind("readme.md")).toBe("md");
    expect(validateImportFilename("bad.docx")).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    expect(importFileSchema.safeParse({ name: "a.txt", size: 10, content: "" }).success).toBe(
      false,
    );
    expect(
      importFileSchema.safeParse({
        name: "big.txt",
        size: 2_000_000,
        content: "x",
      }).success,
    ).toBe(false);
  });
});
