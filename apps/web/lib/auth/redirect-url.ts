/** Build allowlisted app callback URLs without falling back to localhost in production. */
export function getAuthRedirectUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Auth callback paths must be local Nexus routes.")
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (process.env.NODE_ENV === "production" && !configuredSiteUrl) {
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL to this deployment's HTTPS app URL before using authentication redirects."
    )
  }
  const candidate = configuredSiteUrl || window.location.origin
  const normalizedCandidate = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`
  let site: URL
  try {
    site = new URL(normalizedCandidate)
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid public app URL.")
  }

  if (
    site.protocol !== "https:" &&
    site.hostname !== "localhost" &&
    site.hostname !== "127.0.0.1"
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must use HTTPS outside local development."
    )
  }
  if (
    process.env.NODE_ENV === "production" &&
    (site.hostname === "localhost" || site.hostname === "127.0.0.1")
  ) {
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL to this deployment's HTTPS app URL before using authentication redirects."
    )
  }

  const target = new URL(path, site.origin)
  if (target.origin !== site.origin) {
    throw new Error("Auth callbacks must stay on the Nexus app origin.")
  }
  return target.toString()
}
