"use client";

import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/session";
import { appToast } from "@/lib/toast";
import { LogOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

function initials(email?: string) {
  if (!email) return "U";
  const part = email.split("@")[0] ?? "U";
  return part.slice(0, 2).toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex size-9 rounded-full p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">
            {initials(user.email)}
          </AvatarFallback>
        </Avatar>
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium leading-none">Signed in</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <div className="my-1 h-px bg-border" role="separator" />
          <Button
            type="button"
            variant="ghost"
            role="menuitem"
            className="w-full justify-start gap-2 px-2 font-normal"
            onClick={() => {
              setOpen(false);
              signOut().catch(() => {
                appToast.error(
                  "Sign out failed",
                  "Try again or open /logout in your browser.",
                );
              });
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
