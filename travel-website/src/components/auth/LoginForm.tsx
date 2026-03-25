"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginAction } from "@/lib/actions/auth";

interface LoginFormProps {
  callbackUrl?: string;
  registered?: boolean;
}

export default function LoginForm({ callbackUrl, registered }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-foreground">
        Log in
      </h1>

      {registered && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-center text-sm text-green-700">
          Account created successfully. Please sign in.
        </div>
      )}

      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-destructive">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={callbackUrl ?? "/"} />

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
