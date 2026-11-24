const EMAIL_LOCAL_PART = /^[a-z0-9.!#$%&'*+=^_`{|}~-]+$/i
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

/** Normalize only whitespace around an address; never strip invalid input into a different address. */
export function normalizeEmailInput(value: string) {
  return value.trim().toLowerCase()
}

export function getEmailValidationError(value: string) {
  const email = normalizeEmailInput(value)
  if (!email) return "Enter your email address."
  if (email.length > 254)
    return "Email addresses must be 254 characters or fewer."
  if (/[\s<>"/\\:?#[\]\u0000-\u001f\u007f]/.test(email)) {
    return "Enter a valid email address, not a link or code."
  }

  const parts = email.split("@")
  if (parts.length !== 2) return "Enter a valid email address."
  const localPart = parts[0] ?? ""
  const domain = parts[1] ?? ""
  if (
    !localPart ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !EMAIL_LOCAL_PART.test(localPart)
  ) {
    return "Enter a valid email address."
  }

  const labels = domain.split(".")
  if (
    domain.length > 253 ||
    labels.length < 2 ||
    labels.some(
      (label) => !label || label.length > 63 || !DOMAIN_LABEL.test(label)
    )
  ) {
    return "Enter a valid email address."
  }

  return null
}
