"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CircleCheck, CircleX, Eye, EyeOff, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import {
  assessPassword,
  getPasswordValidationError,
} from "@/lib/auth/password-strength"
import {
  getEmailValidationError,
  normalizeEmailInput,
} from "@/lib/auth/email-validation"

type Mode = "login" | "forgot" | "reset"
type AuthViewMode = "login" | "reset"

export function AuthForm({ mode }: { mode: AuthViewMode }) {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState("")
  const [emailInputRejected, setEmailInputRejected] = useState(false)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState("")
  const captchaRef = useRef<TurnstileInstance>(null)
  const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const configured = isSupabaseConfigured()
  const activeMode: Mode =
    mode === "reset" ? "reset" : recoveryMode ? "forgot" : "login"

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")

    const normalizedEmail = normalizeEmailInput(email)
    if (emailInputRejected) {
      setError(
        "The email field accepts email-address characters only. Enter the address again."
      )
      return
    }
    if (activeMode !== "reset") {
      const emailError = getEmailValidationError(email)
      if (emailError) {
        setError(emailError)
        return
      }
    }
    if (activeMode === "login" && !password) {
      setError("Enter your password.")
      return
    }
    setBusy(true)

    try {
      const supabase = createClient()
      const captcha = captchaSiteKey ? captchaToken : undefined
      if (captchaSiteKey && activeMode !== "reset" && !captcha) {
        throw new Error("Complete the security check before continuing.")
      }

      if (activeMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
          options: { captchaToken: captcha },
        })
        if (error) throw error
        router.replace("/")
        router.refresh()
      } else if (activeMode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            captchaToken: captcha,
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
          }
        )
        if (error) throw error
        setMessage(
          "If an account exists for that email, a secure password reset link is on its way."
        )
      } else {
        const passwordError = getPasswordValidationError(password, email)
        if (passwordError) throw new Error(passwordError)
        if (password !== confirmPassword) {
          throw new Error("Your passwords do not match.")
        }
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        await supabase.auth.signOut({ scope: "local" })
        router.replace("/login?updated=1")
      }
    } catch (cause) {
      setError(getAuthErrorMessage(cause, activeMode))
    } finally {
      setBusy(false)
      if (activeMode !== "reset") {
        captchaRef.current?.reset()
        setCaptchaToken("")
      }
    }
  }

  async function googleLogin() {
    setError("")
    setBusy(true)
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      })
      if (error) throw error
    } catch (cause) {
      setError(getAuthErrorMessage(cause, "login"))
      setBusy(false)
    }
  }

  const title =
    activeMode === "login"
      ? "Hey buddy..."
      : activeMode === "forgot"
        ? "Reset your password"
        : "Choose a new password"
  const description =
    activeMode === "login"
      ? "Welcome back to Nexus. Sign in to continue."
      : activeMode === "forgot"
        ? "We’ll email a secure reset link if the account exists."
        : "Use a strong password you have not used elsewhere."

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <motion.section
        initial={{ opacity: 0, y: 14, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm sm:p-9"
      >
        <Link href="/login" className="inline-flex items-center gap-2">
          <img src="/icon.svg" alt="" className="size-8 rounded-lg" />
          <span className="text-sm font-semibold tracking-wide text-foreground">
            NEXUS
          </span>
        </Link>
        <h1 className="mt-7 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        {!configured && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-muted p-3 text-sm text-muted-foreground"
          >
            Authentication is not configured. Add the Supabase URL and
            publishable key in apps/web/.env.local, then restart the app.
          </p>
        )}

        {activeMode === "login" && (
          <>
            <button
              type="button"
              onClick={googleLogin}
              disabled={busy || !configured}
              className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              <GoogleMark /> Continue with Google
            </button>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              OR CONTINUE WITH EMAIL
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={submit} noValidate className="space-y-4">
          {activeMode !== "reset" && (
            <label className="block text-sm font-medium">
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                value={email}
                onChange={(event) => {
                  const nextEmail = event.target.value
                  if (!/^[a-z0-9.!#$%&'*+=^_`{|}~@-]*$/i.test(nextEmail)) {
                    setEmail("")
                    setEmailInputRejected(true)
                    setError(
                      "The email field accepts an email address only. Links, codes, and markup are not allowed."
                    )
                    return
                  }
                  setEmail(nextEmail)
                  setEmailInputRejected(false)
                  setError("")
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text").trim()
                  if (!/^[a-z0-9.!#$%&'*+=^_`{|}~@-]+$/i.test(pasted)) {
                    event.preventDefault()
                    setEmail("")
                    setEmailInputRejected(true)
                    setError(
                      "The email field accepts an email address only. Links, codes, and markup are not allowed."
                    )
                  }
                }}
                aria-invalid={Boolean(error && getEmailValidationError(email))}
                className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal transition-shadow outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          )}

          {activeMode === "login" && (
            <PasswordInput
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
            />
          )}

          {activeMode === "reset" && (
            <>
              <PasswordInput
                label="New password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                visible={showPassword}
                onToggle={() => setShowPassword((visible) => !visible)}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive" role="status">
                  Passwords do not match yet.
                </p>
              )}
              <PasswordStrengthMeter
                assessment={assessPassword(password, email)}
                password={password}
              />
              <PasswordInput
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((visible) => !visible)}
              />
            </>
          )}

          {activeMode !== "reset" && captchaSiteKey && (
            <div className="overflow-x-auto">
              <Turnstile
                ref={captchaRef}
                siteKey={captchaSiteKey}
                onSuccess={setCaptchaToken}
                onExpire={() => setCaptchaToken("")}
                onError={() => {
                  setCaptchaToken("")
                  setError(
                    "The security check could not load. Check the Turnstile site key and allowed domains."
                  )
                }}
                options={{
                  theme: "auto",
                  action: activeMode === "forgot" ? "password-reset" : "login",
                }}
              />
            </div>
          )}

          {activeMode === "login" && (
            <div className="-mt-1 text-right">
              <button
                type="button"
                onClick={() => {
                  setRecoveryMode(true)
                  setError("")
                  setMessage("")
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={
              busy ||
              !configured ||
              (activeMode !== "reset" &&
                Boolean(captchaSiteKey) &&
                !captchaToken)
            }
            className="h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-[opacity,transform] hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {busy
              ? "Please wait…"
              : activeMode === "login"
                ? "Sign in"
                : activeMode === "forgot"
                  ? "Email reset link"
                  : "Update password"}
          </button>
        </form>

        {activeMode === "forgot" && (
          <button
            type="button"
            onClick={() => {
              setRecoveryMode(false)
              setError("")
              setMessage("")
            }}
            className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted"
          >
            Back to sign in
          </button>
        )}

        {activeMode === "login" && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Nexus accounts are managed by your administrator. Contact them for
            access.
          </p>
        )}
        {activeMode === "reset" && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              className="font-medium text-foreground hover:underline"
              href="/login"
            >
              Back to sign in
            </Link>
          </p>
        )}
      </motion.section>
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {error && (
            <AuthToast key="error" kind="error" onDismiss={() => setError("")}>
              {error}
            </AuthToast>
          )}
          {message && (
            <AuthToast
              key="message"
              kind="success"
              onDismiss={() => setMessage("")}
            >
              {message}
            </AuthToast>
          )}
          {params.get("reset") === "expired" && (
            <AuthToast
              key="reset-expired"
              kind="error"
              onDismiss={() => router.replace("/login")}
            >
              That password reset link is invalid or expired. Request a new
              link.
            </AuthToast>
          )}
          {params.get("updated") && (
            <AuthToast
              key="updated"
              kind="success"
              onDismiss={() => router.replace("/login")}
            >
              Your password has been updated. Sign in with your new password.
            </AuthToast>
          )}
          {params.get("loggedOut") && (
            <AuthToast
              key="logged-out"
              kind="success"
              onDismiss={() => router.replace("/login")}
            >
              You’ve been signed out on this browser.
            </AuthToast>
          )}
          {params.get("error") && (
            <AuthToast
              key="callback-error"
              kind="error"
              onDismiss={() => router.replace("/login")}
            >
              {friendlyCallbackError(params.get("error") ?? "")}
            </AuthToast>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  visible,
  onToggle,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  visible: boolean
  onToggle: () => void
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="relative mt-2 block">
        <input
          type={visible ? "text" : "password"}
          required
          minLength={autoComplete === "current-password" ? undefined : 12}
          maxLength={128}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-lg border bg-background px-3 pr-11 font-normal transition-shadow outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  )
}

function PasswordStrengthMeter({
  assessment,
  password,
}: {
  assessment: ReturnType<typeof assessPassword>
  password: string
}) {
  if (!password) return null
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-lime-600",
    "bg-emerald-600",
  ]
  return (
    <div aria-live="polite">
      <div
        className="flex gap-1"
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={assessment.score}
        aria-valuetext={assessment.label}
      >
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`h-1 flex-1 rounded-full ${level <= assessment.score ? colors[assessment.score] : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {assessment.label}. Use at least 12 characters; a long passphrase is
        fine.
      </p>
    </div>
  )
}

function AuthToast({
  kind,
  children,
  onDismiss,
}: {
  kind: "error" | "success" | "info"
  children: React.ReactNode
  onDismiss: () => void
}) {
  const styles = {
    error: "border-destructive/30 bg-card text-destructive",
    success: "border-primary/30 bg-card text-foreground",
    info: "border-border bg-card text-muted-foreground",
  }
  return (
    <motion.div
      role={kind === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 text-sm shadow-lg ${styles[kind]}`}
    >
      {kind === "error" ? (
        <CircleX className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      )}
      <span className="min-w-0 flex-1">{children}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-mt-1 -mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  )
}

function getAuthErrorMessage(cause: unknown, mode: Mode) {
  const details =
    typeof cause === "object" && cause !== null
      ? (cause as {
          message?: unknown
          code?: unknown
          status?: unknown
          name?: unknown
        })
      : {}
  const message =
    typeof details.message === "string"
      ? details.message
      : cause instanceof Error
        ? cause.message
        : ""
  const code =
    typeof details.code === "string" ? details.code.toLowerCase() : ""
  const status = typeof details.status === "number" ? details.status : 0
  const normalized = message.toLowerCase()
  if (
    normalized.includes("missing oauth secret") ||
    normalized.includes("unsupported provider")
  ) {
    return "Google sign-in is missing its OAuth secret in the Supabase project this app is using. In that project’s Authentication → Sign In / Providers → Google settings, enter and save the Google Web client ID and client secret. Confirm its project reference matches NEXT_PUBLIC_SUPABASE_URL. Keep the secret out of Nexus and all NEXT_PUBLIC_ variables."
  }
  if (
    code === "email_not_confirmed" ||
    normalized.includes("email not confirmed")
  ) {
    return "This account’s email is not verified yet. Ask your administrator to confirm the user in Supabase Auth."
  }
  if (
    code === "invalid_credentials" ||
    normalized.includes("invalid login credentials")
  ) {
    return "Email or password is incorrect. Check your details and try again."
  }
  if (normalized.includes("captcha") || code.includes("captcha")) {
    return "The security check could not be verified. Refresh it and try again."
  }
  if (
    code === "weak_password" ||
    normalized.includes("weak_password") ||
    normalized.includes("password should")
  ) {
    return "Choose a stronger password that meets the policy configured in Supabase Auth."
  }
  if (
    mode === "reset" &&
    (status === 401 ||
      code.includes("expired") ||
      normalized.includes("token has expired"))
  ) {
    return "That reset link is invalid or expired. Request a new link and try again."
  }
  if (
    code.includes("rate_limit") ||
    code.includes("too_many") ||
    normalized.includes("rate limit") ||
    status === 429
  ) {
    return "Too many attempts. Wait a few minutes, then try again."
  }
  if (
    normalized.includes("email") &&
    (normalized.includes("invalid") || normalized.includes("address"))
  ) {
    return "Enter a valid email address and try again."
  }
  if (
    mode === "forgot" &&
    (code.includes("email_provider") ||
      normalized.includes("recovery email") ||
      normalized.includes("smtp") ||
      status >= 500)
  ) {
    return "Supabase could not send the reset email. Check the project’s SMTP settings and the Authentication → Email Templates → Reset Password template."
  }
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("networkerror") ||
    (cause instanceof TypeError && !message)
  ) {
    return "Nexus could not reach Supabase. Check your connection and confirm NEXT_PUBLIC_SUPABASE_URL points to the active project."
  }
  if (mode === "login") {
    return status >= 500
      ? "Supabase sign-in is temporarily unavailable. Check the project status and try again shortly."
      : "Could not sign in. Check your email and password, then try again."
  }
  if (mode === "forgot") {
    return "Could not request a reset email. Check Supabase Auth email delivery settings and try again."
  }
  return "Could not update your password. The reset link may have expired; request a new one and try again."
}

function friendlyCallbackError(value: string) {
  const decoded = value.toLowerCase()
  if (
    decoded.includes("missing oauth secret") ||
    decoded.includes("unsupported provider")
  ) {
    return "Google sign-in needs the Google Web client ID and client secret saved in the Supabase project this app uses. Confirm its project reference matches NEXT_PUBLIC_SUPABASE_URL."
  }
  return "Sign-in could not be completed. Please try again or contact your administrator."
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.47-4.72 7.16l7.28 5.64c4.25-3.92 6.7-9.72 6.7-17.27Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.86.93 7.5 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.9-5.82l-7.28-5.64c-2.02 1.35-4.6 2.15-8.62 2.15-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  )
}
