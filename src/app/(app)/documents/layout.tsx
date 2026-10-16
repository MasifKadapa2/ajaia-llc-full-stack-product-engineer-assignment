export const instant = false;

import { AppShell } from "@/components/layout/app-shell";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import Link from "next/link";

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  if (!hasSupabaseEnv()) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <h1 className="text-xl font-semibold">Supabase not configured</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Copy <code className="text-xs">.env.example</code> to{" "}
          <code className="text-xs">.env.local</code>, add your project URL and
          anon key, then run the SQL migration in{" "}
          <code className="text-xs">supabase/migrations</code>.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Back to home
        </Link>
      </div>
    );
  }

  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
