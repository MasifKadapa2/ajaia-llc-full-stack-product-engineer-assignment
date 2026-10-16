import { RelativeTime } from "@/components/documents/relative-time";
import type { DocumentListItem } from "@/types/database";
import { FileText } from "lucide-react";
import Link from "next/link";

type DocumentListProps = {
  documents: DocumentListItem[];
  emptyTitle: string;
  emptyDescription: string;
};

export function DocumentList({
  documents,
  emptyTitle,
  emptyDescription,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-6 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <FileText className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="text-lg font-medium">{emptyTitle}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-background">
      {documents.map((doc) => (
        <li key={doc.id}>
          <Link
            href={`/documents/${doc.id}`}
            className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{doc.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {doc.accessLabel ? `${doc.accessLabel} · ` : ""}
                {doc.owner?.display_name ? `${doc.owner.display_name} · ` : ""}
                Updated <RelativeTime iso={doc.updated_at} />
              </p>
            </div>
            <FileText
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
