import axios from 'axios';
import { supabase } from './supabase';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000', timeout: 15000 });
api.interceptors.request.use(async (config) => {
  const result = await supabase?.auth.getSession();
  if (result?.data.session) config.headers.Authorization = `Bearer ${result.data.session.access_token}`;
  return config;
});
api.interceptors.response.use(response => response, async error => {
  if (error.response?.status === 401) {
    const refreshed = await supabase?.auth.refreshSession();
    if (refreshed?.error) await supabase?.auth.signOut({ scope: 'local' });
  }
  return Promise.reject(error);
});
