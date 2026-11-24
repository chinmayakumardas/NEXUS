const commonPasswords = new Set([
  "password123!",
  "password123",
  "password1!",
  "qwerty12345",
  "letmein12345",
  "welcome12345",
  "admin123456",
  "iloveyou123",
])

export type PasswordAssessment = {
  score: number
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong"
  isCommon: boolean
  containsEmail: boolean
}

export function assessPassword(
  password: string,
  email = ""
): PasswordAssessment {
  const normalized = password.toLowerCase()
  const emailName = email.trim().toLowerCase().split("@")[0] ?? ""
  const isCommon =
    commonPasswords.has(normalized) || /^(.)\1{7,}$/.test(password)
  const containsEmail = emailName.length >= 3 && normalized.includes(emailName)
  const characterClasses = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  let score = 0
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  if (characterClasses >= 2) score += 1
  if (characterClasses >= 3) score += 1
  if (characterClasses === 4) score += 1
  score = Math.min(4, score)
  if (isCommon || containsEmail) score = 0

  const labels: PasswordAssessment["label"][] = [
    "Very weak",
    "Weak",
    "Fair",
    "Good",
    "Strong",
  ]
  return { score, label: labels[score] ?? labels[0]!, isCommon, containsEmail }
}

export function getPasswordValidationError(password: string, email = "") {
  if (password.length < 12)
    return "Use at least 12 characters. A long passphrase works well."
  if (password.length > 128) return "Use 128 characters or fewer."
  const assessment = assessPassword(password, email)
  if (assessment.isCommon) return "Choose a less common password."
  if (assessment.containsEmail)
    return "Your password must not contain your email name."
  return null
}
