"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type DocumentSearchProps = {
  placeholder?: string;
};

export function DocumentSearch({ placeholder = "Search by title…" }: DocumentSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = searchParams.get("q") ?? "";

  return (
    <div className="relative mb-6 max-w-md">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={current}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Search documents"
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value;
          startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value.trim()) {
              params.set("q", value);
            } else {
              params.delete("q");
            }
            const query = params.toString();
            router.replace(query ? `${pathname}?${query}` : pathname);
          });
        }}
      />
    </div>
  );
}
