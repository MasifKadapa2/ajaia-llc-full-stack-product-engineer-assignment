export const instant = false;

import { PapertrailWordmark } from "@/components/brand/papertrail-wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (hasSupabaseEnv()) {
    const user = await getSessionUser();
    if (user) {
      redirect("/documents");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7]">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <PapertrailWordmark className="text-lg" />
        {hasSupabaseEnv() ? (
          <div className="flex gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Sign in
            </Link>
            <Link href="/signup" className={cn(buttonVariants())}>
              Get started
            </Link>
          </div>
        ) : null}
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-12 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Collaborative documents
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Write with clarity. Keep every version on the trail.
        </h1>
        <p className="mt-6 max-w-lg text-lg text-muted-foreground">
          Papertrail is a lightweight workspace for focused writing—rich text,
          autosave, and a calm editor built for teams that ship.
        </p>
        {hasSupabaseEnv() ? (
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
              Create free account
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="mt-10 max-w-md rounded-lg border border-border bg-background p-6 text-left text-sm">
            <p className="font-medium">Setup required</p>
            <p className="mt-2 text-muted-foreground">
              Add <code className="text-xs">.env.local</code> with your Supabase
              URL and anon key (see <code className="text-xs">.env.example</code>
              ), apply{" "}
              <code className="text-xs">supabase/migrations/20251016120000_initial_schema.sql</code>
              , then restart the dev server.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
