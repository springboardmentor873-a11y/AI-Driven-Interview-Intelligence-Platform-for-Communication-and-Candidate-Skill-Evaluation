// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ResumeSkills, { mergeSkills } from './ResumeSkills';

const mocks = vi.hoisted(() => ({ post: vi.fn(), update: vi.fn(), reload: vi.fn(), single: vi.fn() }));
vi.mock('../lib/api', () => ({ api: { post: mocks.post } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ reloadProfile: mocks.reload }) }));
vi.mock('../lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }), update: mocks.update }) } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('merges reviewed skills without case duplicates or discarding existing skills', () => {
  expect(mergeSkills(['python', 'SQL'], ['Python', 'React'])).toEqual(['Python', 'SQL', 'React']);
});
it('requires review before saving and respects unchecked suggestions', async () => {
  mocks.post.mockResolvedValue({ data: { skills: ['Python', 'React'] } });
  mocks.single.mockResolvedValue({ data: { skills: ['SQL'] }, error: null });
  mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: async () => ({ error: null }) }) }) });
  render(<ResumeSkills userId="candidate-id" busy={false} setBusy={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Extract skills' }));
  await screen.findByRole('checkbox', { name: 'React' });
  expect(mocks.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'React' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save selected skills' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ skills: ['SQL', 'Python'] }));
});
