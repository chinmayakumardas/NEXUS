import { redirect } from "next/navigation"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { AuthPage } from "@/components/auth-pages"

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) redirect("/login?setup=required")

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect("/login?reset=expired")

  return <AuthPage mode="reset" />
}
