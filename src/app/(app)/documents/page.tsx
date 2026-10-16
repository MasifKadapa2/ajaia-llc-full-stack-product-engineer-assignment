import { DocumentList } from "@/components/documents/document-list";
import { DocumentSearch } from "@/components/documents/document-search";
import { DocumentsPageHeader } from "@/components/documents/documents-page-header";
import { listAllAccessibleDocuments } from "@/lib/documents/repository";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";
import { Suspense } from "react";

export const instant = false;

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AllDocumentsPage({ searchParams }: PageProps) {
  await connection();
  const { q } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const documents = await listAllAccessibleDocuments(supabase, user.id, q);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <DocumentsPageHeader
        title="All Documents"
        description="Everything you own and everything shared with you."
      />
      <Suspense fallback={null}>
        <DocumentSearch />
      </Suspense>
      <DocumentList
        documents={documents}
        emptyTitle="No documents yet"
        emptyDescription="Create a document, import a file, or wait for a share invite."
      />
    </div>
  );
}
