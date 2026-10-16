import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  email: string | undefined;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { id: user.id, email: user.email };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
