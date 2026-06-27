import { ExploreJobStatus } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const detail = await response.text();
    let message = detail || `Request failed with ${response.status}`;
    try {
      const parsed = JSON.parse(detail);
      message = parsed.detail || message;
    } catch {
      // Keep the raw response text when it is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function startExploration(targetUrl: string) {
  return request<{ job_id: string }>('/explore', {
    method: 'POST',
    body: JSON.stringify({
      target_url: targetUrl,
      max_states: 8,
      max_depth: 3,
      max_actions_per_state: 8,
      strategy: 'bfs',
      llm_rerank: false,
      allow_external_links: true,
    }),
  });
}

export async function getExplorationStatus(jobId: string) {
  return request<ExploreJobStatus>(`/explore/${jobId}`);
}

export async function getBackendHealth() {
  const health = await request<{ status: string; service?: string }>('/health');
  if (health.service !== 'flowguard-web-agent') {
    throw new Error('Connected service is not the FlowGuard backend');
  }
  return health;
}
