/**
 * Shared password validation used by Signup and ResetPassword so the two
 * flows enforce identical rules. Previously Signup required 8+ chars and a
 * blocklist check while ResetPassword only required 6 chars with no
 * blocklist — letting users signup strong and then reset to weak.
 */

export const MIN_PASSWORD_LENGTH = 8;

const COMMON_WEAK_PASSWORDS = [
  "password",
  "password1",
  "12345678",
  "qwerty",
  "qwerty123",
  "letmein",
  "admin",
  "welcome",
  "123456789",
  "iloveyou",
];

export function isWeakPassword(pw: string): boolean {
  return COMMON_WEAK_PASSWORDS.includes(pw.toLowerCase());
}

export interface PasswordStrength {
  label: string;
  color: string;
  width: string;
}

export function getPasswordStrength(pw: string): PasswordStrength {
  if (pw.length === 0) return { label: "", color: "", width: "0%" };
  if (isWeakPassword(pw)) {
    return { label: "Very Weak", color: "bg-destructive", width: "10%" };
  }
  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "bg-destructive", width: "25%" };
  if (score === 2) return { label: "Fair", color: "bg-yellow-500", width: "50%" };
  if (score === 3) return { label: "Good", color: "bg-secondary", width: "75%" };
  return { label: "Strong", color: "bg-green-500", width: "100%" };
}
