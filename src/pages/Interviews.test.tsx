// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InterviewSetup } from './Interviews';

const mocks = vi.hoisted(() => ({ post: vi.fn(), insert: vi.fn(), single: vi.fn(), role: 'candidate' }));
vi.mock('../lib/api', () => ({ api: { post: mocks.post } }));
vi.mock('../lib/supabase', () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ profileLoading: false, session: { user: { id: 'owner' } }, profile: { role: mocks.role, preferred_role: 'Developer', skills: ['Python'] } }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.role = 'candidate'; });

it('retries saving generated questions without another paid generation request', async () => {
  mocks.post.mockResolvedValue({ data: { questions: ['a', 'b', 'c', 'd', 'e'] } });
  mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
  mocks.single.mockResolvedValueOnce({ error: { message: 'Storage unavailable' } }).mockResolvedValueOnce({ data: { id: 'session-id' }, error: null });
  render(<MemoryRouter><Routes><Route path="/" element={<InterviewSetup />} /><Route path="/interviews/:id" element={<div>Saved interview room</div>} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Generate questions & start' }));
  await screen.findByRole('button', { name: 'Retry saving session' });
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving session' }));
  await waitFor(() => expect(screen.getByText('Saved interview room')).toBeTruthy());
  expect(mocks.post).toHaveBeenCalledTimes(1);
  expect(mocks.insert).toHaveBeenCalledTimes(2);
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner', questions: ['a', 'b', 'c', 'd', 'e'] }));
});

it('does not expose generation controls to an evaluator', () => {
  mocks.role = 'recruiter';
  render(<MemoryRouter><InterviewSetup /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'Generate questions & start' })).toBeNull();
  expect(mocks.post).not.toHaveBeenCalled();
});
