import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { PapertrailWordmark } from "@/components/brand/papertrail-wordmark";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (!hasSupabaseEnv()) {
    redirect("/");
  }

  const user = await getSessionUser();
  if (user) {
    redirect("/documents");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <PapertrailWordmark className="text-xl" />
          <h1 className="text-lg font-medium">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue to your workspace.
          </p>
        </div>
        <AuthForm mode="sign-in" action={signIn} />
      </div>
    </div>
  );
}
