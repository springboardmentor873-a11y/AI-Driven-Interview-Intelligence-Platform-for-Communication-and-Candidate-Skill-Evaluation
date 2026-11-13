export function passwordError(password: string): string | null {
  if (password.length < 12) return 'Use at least 12 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Include uppercase and lowercase letters and a number.';
  }
  return null;
}
export const emailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const phoneValid = (phone: string) => /^\+[1-9]\d{7,14}$/.test(phone);
export function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Something went wrong. Please try again.';
  if (/fetch|network/i.test(message)) return 'We couldn’t connect. Check your internet connection and try again.';
  if (/invalid login credentials/i.test(message)) return 'Your email or password is incorrect. Please try again.';
  if (/email not confirmed/i.test(message)) return 'Please verify your email before signing in. Check your inbox for the confirmation link.';
  return message;
}
