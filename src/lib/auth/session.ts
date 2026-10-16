import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  email: string | undefined;
};

// Cached per-request so layout + page share one auth check instead of 2x roundtrips.
// Uses getClaims (local JWT verify, no network) instead of getUser (network)
// for speed. Middleware still refreshes the session via getUser.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  const sub = data?.claims?.sub;
  if (error || !sub) {
    return null;
  }

  return { id: sub, email: data.claims.email as string | undefined };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
