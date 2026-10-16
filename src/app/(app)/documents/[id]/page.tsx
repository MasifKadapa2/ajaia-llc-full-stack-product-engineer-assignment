import { DocumentEditor } from "@/components/editor/document-editor";
import { getDocumentWithAccess } from "@/lib/documents/repository";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DocumentPage({ params }: PageProps) {
  await connection();
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const result = await getDocumentWithAccess(supabase, user.id, id);

  if (!result.ok) {
    if (result.code === "not_found" || result.code === "unauthorized") {
      notFound();
    }
    throw new Error(result.error);
  }

  const { document, access } = result.data;

  return (
    <DocumentEditor
      documentId={document.id}
      initialTitle={document.title}
      initialContent={document.content}
      serverUpdatedAt={document.updated_at}
      access={access}
    />
  );
}
