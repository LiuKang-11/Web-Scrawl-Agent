import {
  ExplorerGraph,
  ExploreJobStatus,
  PipelineResponse,
  PlaywrightActionRunResult,
  TestCase,
  UiPathExecutionSubmission,
  UiPathJobStatus,
} from './types';

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
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function startExploration(targetUrl: string) {
  return request<{ job_id: string }>('/explore', {
    method: 'POST',
    body: JSON.stringify({
      target_url: targetUrl,
      max_states: 8,
      max_depth: 2,
      max_actions_per_state: 8,
      strategy: 'bfs',
      llm_rerank: false,
      allow_external_links: false,
    }),
  });
}

export async function getExplorationStatus(jobId: string) {
  return request<ExploreJobStatus>(`/explore/${jobId}`);
}

export async function getBackendHealth() {
  return request<{ status: string }>('/health');
}

export async function buildPipeline(graph: ExplorerGraph) {
  return request<PipelineResponse>('/pipeline', {
    method: 'POST',
    body: JSON.stringify({ graph }),
  });
}

export async function executeUiPathTests(baseUrl: string, testCases: TestCase[], packageId?: string) {
  return request<UiPathExecutionSubmission>('/uipath/execute', {
    method: 'POST',
    body: JSON.stringify({
      base_url: baseUrl,
      package_id: packageId,
      test_cases: testCases.map(testCase => ({
        id: testCase.id,
        name: testCase.name,
        priority: testCase.priority,
        category: testCase.category,
        feature: testCase.feature,
        steps: testCase.steps || [],
        actions: testCase.actions || [],
        expected_result: testCase.expectedResult || '',
      })),
    }),
  });
}

export async function getUiPathJob(jobId: number) {
  return request<UiPathJobStatus>(`/uipath/jobs/${jobId}`);
}

export async function runPlaywrightActions(baseUrl: string, testCases: TestCase[], packageId?: string) {
  return request<PlaywrightActionRunResult>('/uipath/run-actions', {
    method: 'POST',
    body: JSON.stringify({
      base_url: baseUrl,
      package_id: packageId,
      headless: true,
      test_cases: testCases.map(testCase => ({
        id: testCase.id,
        name: testCase.name,
        priority: testCase.priority,
        category: testCase.category,
        feature: testCase.feature,
        steps: testCase.steps || [],
        actions: testCase.actions || [],
        expected_result: testCase.expectedResult || '',
      })),
    }),
  });
}
