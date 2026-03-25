"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export interface LoginActionState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginActionState | undefined,
  formData: FormData
): Promise<LoginActionState> {
  const redirectTo = (formData.get("redirectTo") as string) || "/";

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
