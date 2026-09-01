import type { ProjectAggregate, ProjectInput } from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
    fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getProject: (id: string): Promise<ProjectAggregate> =>
    fetch(`${API_BASE}/projects/${id}`).then(handleResponse),

  executeNextTask: (id: string): Promise<ProjectAggregate> =>
    fetch(`${API_BASE}/projects/${id}/execute-next-task`, { method: 'POST' }).then(handleResponse),

  runUntilBlocked: (id: string, maxIterations = 20): Promise<ProjectAggregate> =>
    fetch(`${API_BASE}/projects/${id}/run-until-blocked?max_iterations=${maxIterations}`, { method: 'POST' }).then(handleResponse),

  deployProject: (id: string) =>
    fetch(`${API_BASE}/projects/${id}/deploy`, { method: 'POST' }).then(handleResponse),

  rollbackProject: (id: string) =>
    fetch(`${API_BASE}/projects/${id}/rollback`, { method: 'POST' }).then(handleResponse),

  runAutonomousProject: (id: string) =>
    fetch(`${API_BASE}/projects/${id}/run`, { method: 'POST' }).then(handleResponse),

  getWebSocketUrl: (id: string) => {
    const wsBase = API_BASE.replace(/^http/, 'ws');
    return `${wsBase}/ws/projects/${id}/runtime`;
  },

  getMemoryStats: () =>
    fetch(`${API_BASE}/memory/stats`).then(handleResponse),

  getRecentMemory: (limit = 5) =>
    fetch(`${API_BASE}/memory/recent?limit=${limit}`).then(handleResponse),
};
