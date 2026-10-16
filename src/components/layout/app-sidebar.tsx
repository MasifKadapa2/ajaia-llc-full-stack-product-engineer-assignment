"use client";

import { createDocumentAction } from "@/app/actions/documents";
import { appToast } from "@/lib/toast";
import { ImportDocumentButton } from "@/components/documents/import-document-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Files, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/documents", label: "All Documents", icon: Files },
  { href: "/documents/mine", label: "My Documents", icon: FileText },
  { href: "/documents/shared", label: "Shared with Me", icon: Users },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleNewDocument() {
    setPending(true);
    try {
      const result = await createDocumentAction();
      if (result.ok) {
        router.push(`/documents/${result.data.id}`);
      } else {
        appToast.error("Could not create document", result.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Button
        className="w-full justify-start gap-2"
        onClick={handleNewDocument}
        disabled={pending}
      >
        <Plus className="size-4" aria-hidden />
        New Document
      </Button>
      <ImportDocumentButton />
      <nav className="flex flex-col gap-1" aria-label="Workspace">
        {navItems.map((item) => {
          const active =
            item.href === "/documents"
              ? pathname === "/documents"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto md:hidden">
        <Link
          href="/documents"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Open navigation
        </Link>
      </div>
    </div>
  );
}
