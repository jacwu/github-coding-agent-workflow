"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export interface LoginActionState {
  error?: string;
}

function sanitizeRedirectTo(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "/";
  }

  return value.startsWith("/") && !value.startsWith("//") && !value.includes("://")
    ? value
    : "/";
}

export async function loginAction(
  _prevState: LoginActionState | undefined,
  formData: FormData
): Promise<LoginActionState> {
  const redirectTo = sanitizeRedirectTo(formData.get("redirectTo"));

  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
}
