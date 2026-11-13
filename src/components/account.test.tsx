// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { Field } from './ui';
import Dashboard from '../pages/Dashboard';
import { AuthPage } from '../pages/AuthPages';
import { editableProfileFields, type Profile } from '../lib/supabase';

const mocks = vi.hoisted(() => ({ auth: { loading: false, session: null as null | { user: { user_metadata: { full_name: string } } }, recovery: false, profile: null }, signUp: vi.fn(), signInWithPassword: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../lib/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/supabase')>();
  return { ...original, isConfigured: true, oauthEnabled: { google: false, linkedin_oidc: false }, supabase: { auth: { signUp: mocks.signUp, signInWithPassword: mocks.signInWithPassword } } };
});
afterEach(() => { cleanup(); mocks.auth = { loading: false, session: null, recovery: false, profile: null }; vi.clearAllMocks(); });
function guard() {
  render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="/login" element={<div>Login destination</div>} /><Route path="/reset-password" element={<div>Recovery destination</div>} /><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<div>Private dashboard</div>} /></Route></Routes></MemoryRouter>);
}
describe('Account and privacy boundaries', () => {
  it('redirects unauthenticated users away from private routes', () => { guard(); expect(screen.getByText('Login destination')).toBeTruthy(); expect(screen.queryByText('Private dashboard')).toBeNull(); });
  it('waits for session initialization before rendering private pages', () => { mocks.auth.loading = true; guard(); expect(screen.getByRole('status')).toBeTruthy(); expect(screen.queryByText('Private dashboard')).toBeNull(); });
  it('allows authenticated access, but keeps recovery sessions in the reset flow', () => {
    mocks.auth.session = { user: { user_metadata: { full_name: 'Test Candidate' } } }; mocks.auth.recovery = true;
    guard(); expect(screen.getByText('Recovery destination')).toBeTruthy();
    cleanup(); mocks.auth.recovery = false; guard(); expect(screen.getByText('Private dashboard')).toBeTruthy();
  });
  it('never sends protected role or identity columns in a profile edit', () => {
    const profile = { id: 'id', role: 'admin', full_name: ' Candidate ', phone: '', college: '', degree: '', graduation_year: null, skills: [], preferred_role: '', bio: '', avatar_path: null, email_updates: false, practice_reminders: false, analytics_consent: false } satisfies Profile;
    const payload = editableProfileFields(profile);
    expect(payload).not.toHaveProperty('role'); expect(payload).not.toHaveProperty('id'); expect(payload.full_name).toBe('Candidate');
  });
  it('toggles password visibility without submitting the form', () => {
    const submit = vi.fn(); render(<form onSubmit={submit}><Field label="Password" type="password" defaultValue="NotARealPassword12" /></form>);
    const field = screen.getByLabelText('Password') as HTMLInputElement;
    expect(field.type).toBe('password'); fireEvent.click(screen.getByRole('button', { name: 'Show password' })); expect(field.type).toBe('text'); expect(submit).not.toHaveBeenCalled();
  });
  it('renders only empty interview data for a new account', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText('No interviews yet')).toBeTruthy();
    expect(screen.getByText('Planned features')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Your interview statistics' })).toBeNull();
    expect(screen.getByRole('link', { name: /Resume details/ }).getAttribute('href')).toBe('/resume');
    expect(screen.getByRole('link', { name: /Explore mock interviews/ }).getAttribute('href')).toBe('/interview');
  });
  it('surfaces incorrect credential errors from Supabase', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<MemoryRouter><AuthPage mode="login" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'candidate@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'WrongPassphrase42' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('incorrect'));
  });
  it('does not submit signup when password confirmation differs', async () => {
    render(<MemoryRouter><AuthPage mode="register" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Candidate' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'candidate@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'StrongPassphrase42' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'OtherPassphrase42' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);
    expect(screen.getByRole('alert').textContent).toContain('don’t match'); expect(mocks.signUp).not.toHaveBeenCalled();
  });
});
