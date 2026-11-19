import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadResume, MAX_RESUME_BYTES, removeResume, uploadResume, validateResume } from './resumes';

const storage = vi.hoisted(() => ({ list: vi.fn(), upload: vi.fn(), remove: vi.fn(), download: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { storage: { from: () => storage } } }));
beforeEach(() => vi.resetAllMocks());
const pdf = () => new File(['%PDF-1.7\nresume'], 'resume.pdf', { type: 'application/pdf' });

describe('Private resume storage', () => {
  it('accepts PDFs and rejects renamed non-PDF files', async () => {
    await expect(validateResume(pdf())).resolves.toBeUndefined();
    await expect(validateResume(new File(['hello'], 'resume.pdf', { type: 'application/pdf' }))).rejects.toThrow('does not appear');
    await expect(validateResume(new File(['%PDF-'], 'resume.exe'))).rejects.toThrow('Choose a PDF');
  });
  it('rejects empty and oversized uploads before storage is called', async () => {
    await expect(uploadResume('candidate', new File([], 'resume.pdf'))).rejects.toThrow('non-empty');
    await expect(uploadResume('candidate', new File([new Uint8Array(MAX_RESUME_BYTES + 1)], 'resume.pdf'))).rejects.toThrow('5 MB');
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it('replaces only the current owner object without deleting the existing file first', async () => {
    storage.upload.mockResolvedValue({ error: null });
    const file = pdf();
    await uploadResume('candidate-id', file);
    expect(storage.upload).toHaveBeenCalledWith('candidate-id/resume.pdf', file, expect.objectContaining({ upsert: true, contentType: 'application/pdf' }));
    expect(storage.remove).not.toHaveBeenCalled();
    storage.upload.mockResolvedValue({ error: new Error('Upload failed') });
    await expect(uploadResume('candidate-id', pdf())).rejects.toThrow('Upload failed');
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it('distinguishes missing files from storage errors', async () => {
    storage.list.mockResolvedValue({ data: [], error: null });
    await expect(loadResume('candidate-id')).resolves.toBeNull();
    storage.list.mockResolvedValue({ data: null, error: new Error('Storage unavailable') });
    await expect(loadResume('candidate-id')).rejects.toThrow('Storage unavailable');
  });
  it('does not report failed removal as success', async () => {
    storage.remove.mockResolvedValue({ error: new Error('Permission denied') });
    await expect(removeResume('candidate-id')).rejects.toThrow('Permission denied');
    expect(storage.remove).toHaveBeenCalledWith(['candidate-id/resume.pdf']);
  });
});
