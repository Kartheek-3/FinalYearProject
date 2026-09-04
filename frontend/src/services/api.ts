import type { ProjectAggregate, ProjectInput, RuntimeEvent } from '../types/api';
import { authService } from '../auth/authService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await authService.getIdToken();
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...init,
    headers,
  });
}

async function handleResponse<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }
  return res.json();
}

export const api = {
  health: () => fetch(`${API_BASE}/health`).then(handleResponse),
  
  createProject: (data: ProjectInput): Promise<ProjectAggregate> =>
    authFetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  listProjects: (): Promise<ProjectAggregate[]> =>
    authFetch(`${API_BASE}/projects`).then(handleResponse),

  getProject: (id: string): Promise<ProjectAggregate> =>
    authFetch(`${API_BASE}/projects/${id}`).then(handleResponse),

  executeNextTask: (id: string): Promise<ProjectAggregate> =>
    authFetch(`${API_BASE}/projects/${id}/execute-next-task`, { method: 'POST' }).then(handleResponse),

  runUntilBlocked: (id: string, maxIterations = 20): Promise<ProjectAggregate> =>
    authFetch(`${API_BASE}/projects/${id}/run-until-blocked?max_iterations=${maxIterations}`, { method: 'POST' }).then(handleResponse),

  deployProject: (id: string) =>
    authFetch(`${API_BASE}/projects/${id}/deploy`, { method: 'POST' }).then(handleResponse),

  rollbackProject: (id: string) =>
    authFetch(`${API_BASE}/projects/${id}/rollback`, { method: 'POST' }).then(handleResponse),

  runAutonomousProject: (id: string) =>
    authFetch(`${API_BASE}/projects/${id}/run`, { method: 'POST' }).then(handleResponse),

  getWebSocketUrl: async (id: string): Promise<string> => {
    const wsBase = API_BASE.replace(/^http/, 'ws');
    const token = await authService.getIdToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${wsBase}/ws/projects/${id}/runtime${tokenParam}`;
  },

  getTerminalWebSocketUrl: async (id: string): Promise<string> => {
    const wsBase = API_BASE.replace(/^http/, 'ws');
    const token = await authService.getIdToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${wsBase}/ws/projects/${id}/terminal${tokenParam}`;
  },

  getFiles: (id: string): Promise<string[]> =>
    authFetch(`${API_BASE}/projects/${id}/files`).then(handleResponse),

  getFileContent: (id: string, path: string): Promise<{ path: string; content: string }> =>
    authFetch(`${API_BASE}/projects/${id}/files/${encodeURIComponent(path)}`).then(handleResponse),

  createFile: (id: string, path: string, content = ''): Promise<{ status: string; path: string }> =>
    authFetch(`${API_BASE}/projects/${id}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    }).then(handleResponse),

  saveFile: (id: string, path: string, content: string): Promise<{ status: string; path: string }> =>
    authFetch(`${API_BASE}/projects/${id}/files/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).then(handleResponse),

  createFolder: (id: string, path: string): Promise<{ status: string; path: string }> =>
    authFetch(`${API_BASE}/projects/${id}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }).then(handleResponse),

  renameItem: (id: string, old_path: string, new_path: string): Promise<{ status: string; old_path: string; new_path: string }> =>
    authFetch(`${API_BASE}/projects/${id}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_path, new_path }),
    }).then(handleResponse),

  deleteItem: (id: string, path: string): Promise<{ status: string; path: string }> =>
    authFetch(`${API_BASE}/projects/${id}/files/${encodeURIComponent(path)}`, {
      method: 'DELETE',
    }).then(handleResponse),

  getMemoryStats: () =>
    authFetch(`${API_BASE}/memory/stats`).then(handleResponse),

  getRecentMemory: (limit = 5) =>
    authFetch(`${API_BASE}/memory/recent?limit=${limit}`).then(handleResponse),

  getProjectStatus: (id: string): Promise<{ project_id: string; is_running: boolean; stage: string }> =>
    authFetch(`${API_BASE}/projects/${id}/status`).then(handleResponse),

  getProjectEvents: (id: string): Promise<RuntimeEvent[]> =>
    authFetch(`${API_BASE}/projects/${id}/events`).then(handleResponse),
};

