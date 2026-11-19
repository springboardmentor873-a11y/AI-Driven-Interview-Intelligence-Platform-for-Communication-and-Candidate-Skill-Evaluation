import { supabase } from './supabase';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export type ResumeInfo = { updatedAt: string | null; size: number };

export async function validateResume(file: File) {
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) throw new Error('Choose a PDF document.');
  if (!file.size || file.size > MAX_RESUME_BYTES) throw new Error('Choose a non-empty PDF up to 5 MB.');
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== '%PDF-') throw new Error('This file does not appear to be a PDF. Export your resume as a PDF and try again.');
}

function bucket() {
  if (!supabase) throw new Error('Account services are not connected.');
  return supabase.storage.from('resumes');
}
const pathFor = (userId: string) => `${userId}/resume.pdf`;

export async function loadResume(userId: string): Promise<ResumeInfo | null> {
  const { data, error } = await bucket().list(userId, { search: 'resume.pdf', limit: 10 });
  if (error) throw error;
  const item = data?.find(file => file.name === 'resume.pdf');
  return item ? { updatedAt: item.updated_at, size: Number(item.metadata?.size || 0) } : null;
}
export async function uploadResume(userId: string, file: File) {
  await validateResume(file);
  // One stable object per candidate. Failed uploads do not delete the previous file.
  const { error } = await bucket().upload(pathFor(userId), file, { contentType: 'application/pdf', upsert: true, cacheControl: '0' });
  if (error) throw error;
}
export async function removeResume(userId: string) {
  const { error } = await bucket().remove([pathFor(userId)]);
  if (error) throw error;
}
export async function downloadResume(userId: string) {
  const { data, error } = await bucket().download(pathFor(userId));
  if (error) throw error;
  return data;
}
