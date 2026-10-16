"use client";

import type { AuthActionState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appToast } from "@/lib/toast";
import Link from "next/link";
import { useActionState, useEffect } from "react";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  action: (
    prev: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
};

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.error) {
      appToast.error(
        mode === "sign-up" ? "Sign up failed" : "Sign in failed",
        state.error,
      );
    }
    if (state.message) {
      appToast.success("Account created", state.message);
    }
  }, [state.error, state.message, mode]);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "sign-up" && (
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            required
            disabled={pending}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={
            mode === "sign-up" ? "new-password" : "current-password"
          }
          minLength={6}
          required
          disabled={pending}
        />
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.message && (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Please wait…"
          : mode === "sign-up"
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            No account?{" "}
            <Link href="/signup" className="text-foreground underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
