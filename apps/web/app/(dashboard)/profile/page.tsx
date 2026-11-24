import { redirect } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { createClient } from "@/lib/supabase/server"

function safeAvatarUrl(value: unknown) {
  if (typeof value !== "string") return undefined
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export default async function ProfilePage() {
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

  const name: string =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "") ||
    (user.email ?? "Nexus user")
  const email = user.email ?? ""
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() || "N"
  const avatar =
    safeAvatarUrl(profile?.avatar_url) ??
    safeAvatarUrl(user.user_metadata.avatar_url)

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 p-2 sm:p-6">
      <div>
        <p className="text-sm text-muted-foreground">Account</p>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="border-b px-6 py-4 font-semibold">Your profile</div>
        <div className="flex items-center gap-4 p-6">
          <Avatar className="size-14">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="text-base">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
