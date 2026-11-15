// Client-side checks mirror the API's rules so people get instant feedback.
// The API still validates everything again: these are a convenience, not the security.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function passwordProblem(password: string): string | undefined {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 72) return "Password must be at most 72 characters";
  if (!/[A-Za-z]/.test(password)) return "Password must contain a letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return undefined;
}

export function emailProblem(email: string): string | undefined {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address";
  return undefined;
}

export type Errors<K extends string> = Partial<Record<K, string>>;
export const hasErrors = (e: object) => Object.values(e).some(Boolean);
