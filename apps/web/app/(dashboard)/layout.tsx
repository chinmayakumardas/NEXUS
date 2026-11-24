import { redirect } from "next/navigation"
import { ApplicationShell1 } from "@/components/application-shell1"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) redirect("/login?setup=required")

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const metadataName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""
  const fullName =
    profile?.full_name?.trim() || metadataName || user.email || "Nexus user"
  const avatarValue =
    profile?.avatar_url ??
    (typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined)
  let avatar: string | undefined
  try {
    const parsedAvatar = new URL(avatarValue ?? "")
    if (parsedAvatar.protocol === "https:") avatar = parsedAvatar.toString()
  } catch {
    avatar = undefined
  }
  return (
    <ApplicationShell1
      user={{ name: fullName, email: user.email ?? "", avatar }}
    >
      {children}
    </ApplicationShell1>
  )
}
