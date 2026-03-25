import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import RegisterForm from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-24">
      <RegisterForm />
    </main>
  );
}
