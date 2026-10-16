import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        This document may not exist or you may not have access.
      </p>
      <Link href="/documents" className={cn(buttonVariants())}>
        Go to documents
      </Link>
    </div>
  );
}
