import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// OC Management
export const getOCs = (guildId: string, filters?: { ownerId?: string; fandom?: string; search?: string }) => {
  const params: any = { guildId };
  if (filters) {
    Object.assign(params, filters);
  }
  return api.get('/ocs', { params });
};

export const getOC = (id: string) => api.get(`/ocs/${id}`);

export const createOC = (data: any) => api.post('/ocs', data);

export const updateOC = (id: string, data: any) => api.put(`/ocs/${id}`, data);

export const deleteOC = (id: string) => api.delete(`/ocs/${id}`);

export const updateOCPlaylist = (id: string, action: 'add' | 'remove', songLink: string) =>
  api.put(`/ocs/${id}/playlist`, { action, songLink });

export const addOCNote = (id: string, note: string) =>
  api.put(`/ocs/${id}/notes`, { note });

// Fandom Management
export const getFandoms = (guildId: string) => api.get('/fandoms', { params: { guildId } });

// Prompt Management
export const getPrompts = (guildId: string, category?: string, fandom?: string) => {
  const params: any = { guildId };
  if (category) params.category = category;
  if (fandom) params.fandom = fandom;
  return api.get('/prompts', { params });
};

export const createPrompt = (data: any) => api.post('/prompts', data);

export const deletePrompt = (id: string) => api.delete(`/prompts/${id}`);

// QOTD Management
export const getQOTDs = (guildId: string, category?: string, fandom?: string) => {
  const params: any = { guildId };
  if (category) params.category = category;
  if (fandom) params.fandom = fandom;
  return api.get('/qotd', { params });
};

export const createQOTD = (data: any) => api.post('/qotd', data);

export const updateQOTD = (id: string, data: any) => api.put(`/qotd/${id}`, data);

export const deleteQOTD = (id: string) => api.delete(`/qotd/${id}`);

// Trivia Management
export const getTrivia = (guildId: string, category?: string) => {
  const params: any = { guildId };
  if (category) params.category = category;
  return api.get('/trivia', { params });
};

export const createTrivia = (data: any) => api.post('/trivia', data);

export const deleteTrivia = (id: string) => api.delete(`/trivia/${id}`);

// COTW Management
export const getCurrentCOTW = (guildId: string) =>
  api.get('/cotw/current', { params: { guildId } });

export const getCOTWHistory = (guildId: string, limit: number = 20) =>
  api.get('/cotw/history', { params: { guildId, limit } });

export const rerollCOTW = (guildId: string) =>
  api.post('/cotw/reroll', { guildId });

// Birthday Management
export const getBirthdays = (guildId: string, month?: string) => {
  const params: any = { guildId };
  if (month) params.month = month;
  return api.get('/birthdays', { params });
};

export const setBirthday = (ocId: string, date: string) =>
  api.put(`/birthdays/${ocId}`, { birthday: date });

export const clearBirthday = (ocId: string) =>
  api.put(`/birthdays/${ocId}`, { birthday: null });

// Config Management
export const getConfig = (guildId: string) =>
  api.get('/config', { params: { guildId } });

export const updateConfig = (guildId: string, data: any) =>
  api.put('/config', { guildId, ...data });

export const getChannels = (guildId: string) =>
  api.get('/config/channels', { params: { guildId } });

export const getRoles = (guildId: string) =>
  api.get('/config/roles', { params: { guildId } });

export const createRole = (guildId: string, name: string, color?: number) =>
  api.post('/config/roles', { guildId, name, color });

// Admin Management
export const testQOTD = (data: { guildId: string; category?: string; channelId?: string; qotdId?: string }) =>
  api.post('/admin/test/qotd', data);

export const testPrompt = (data: { guildId: string; category?: string; channelId?: string; promptId?: string }) =>
  api.post('/admin/test/prompt', data);

export const testCOTW = (data: { guildId: string; ocId?: string; channelId?: string }) =>
  api.post('/admin/test/cotw', data);

export const testBirthday = (data: { guildId: string; ocId: string; channelId?: string }) =>
  api.post('/admin/test/birthday', data);

// User Management
export const getUsers = (userIds: string[], guildId?: string) => {
  const params: any = { userIds: userIds.join(',') };
  if (guildId) params.guildId = guildId;
  return api.get('/users', { params });
};

export default api;

