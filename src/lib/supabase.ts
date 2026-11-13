import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isConfigured = Boolean(url && key && !url.includes('your-project') && key !== 'your-publishable-key');
export const supabase = isConfigured ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
}) : null;
export const oauthEnabled = {
  google: isConfigured && import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true',
  linkedin_oidc: isConfigured && import.meta.env.VITE_LINKEDIN_AUTH_ENABLED === 'true',
};
export const redirectUrl = (path: string) => `${window.location.origin}${path}`;

export type Profile = {
  id: string; full_name: string; phone: string; college: string; degree: string;
  graduation_year: number | null; skills: string[]; preferred_role: string; bio: string;
  avatar_path: string | null; role: 'candidate' | 'recruiter' | 'admin';
  email_updates: boolean; practice_reminders: boolean; analytics_consent: boolean;
};

export const editableProfileFields = (profile: Profile) => ({
  full_name: profile.full_name.trim(), phone: profile.phone.trim(), college: profile.college.trim(),
  degree: profile.degree.trim(), graduation_year: profile.graduation_year,
  skills: profile.skills, preferred_role: profile.preferred_role.trim(), bio: profile.bio.trim(),
});
