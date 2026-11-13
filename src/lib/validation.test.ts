import { describe, expect, it } from 'vitest';
import { emailValid, passwordError, phoneValid, readableError } from './validation';
describe('Account input validation', () => {
  it('requires a long mixed-case password with a number', () => {
    expect(passwordError('Short1')).toBeTruthy();
    expect(passwordError('alllowercase12')).toBeTruthy();
    expect(passwordError('NoNumbersHere')).toBeTruthy();
    expect(passwordError('StrongPassphrase42')).toBeNull();
  });
  it('rejects malformed email and phone values', () => {
    expect(emailValid('candidate@example.com')).toBe(true);
    expect(emailValid('candidate@')).toBe(false);
    expect(emailValid('some one@example.com')).toBe(false);
    expect(phoneValid('+919876543210')).toBe(true);
    expect(phoneValid('+019876543210')).toBe(false);
    expect(phoneValid('9876543210')).toBe(false);
    expect(phoneValid('+911')).toBe(false);
  });
  it('makes authentication and connection errors actionable', () => {
    expect(readableError(new Error('Invalid login credentials'))).toContain('incorrect');
    expect(readableError(new Error('Email not confirmed'))).toContain('verify');
    expect(readableError(new TypeError('Failed to fetch'))).toContain('connection');
  });
});
