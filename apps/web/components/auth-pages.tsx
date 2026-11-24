import { Suspense } from "react"
import { AuthForm } from "@/components/auth-form"

export function AuthPage({ mode }: { mode: "login" | "reset" }) {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">
          Loading…
        </main>
      }
    >
      <AuthForm mode={mode} />
    </Suspense>
  )
}
