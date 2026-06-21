export type TabType = 'Dashboard' | 'App Explorer' | 'Test Cases' | 'Test Execution' | 'Failure Analysis' | 'Reports' | 'Help Center';

export type TestingSourceType = 'Public URL' | 'Localhost' | 'GitHub Repo';

export interface TestCase {
  id: string;
  name: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'UI' | 'API' | 'Security';
  status: 'Approved' | 'Generated' | 'Draft' | 'Failed';
  generatedBy: string;
}

export interface FailureItem {
  id: string;
  title: string;
  step: string;
  severity: 'Critical Failure' | 'Visual Regression' | 'Minor issue';
  riskScore: number;
  timeLimit?: string;
  diffPercent?: string;
  screenshotUrl: string;
  targetArea: { top: string; left: string; width: string; height: string };
  targetLabel: string;
  iconName: 'warning' | 'visibility_off';
  rootCause: string;
  suggestedFix: string;
  logs: string[];
}

export interface UserFlowPath {
  id: string;
  name: string;
  risk: 'High Risk' | 'Medium Risk' | 'Low Risk';
  steps: string;
}

export interface DiscoveredNode {
  id: string;
  label: string;
  type: 'Page' | 'Form' | 'API';
  status?: 'Passed' | 'Failed' | 'Draft';
  endpoint?: string;
}

export interface ExplorerElement {
  tag?: string;
  text?: string;
  type?: string;
  role?: string;
  href?: string;
  id?: string;
  name?: string;
  selector?: string;
  disabled?: boolean;
  visible?: boolean;
}

export interface ExplorerNode {
  state_id: string;
  url: string;
  title: string;
  page_summary: string;
  screenshot_b64?: string | null;
  interactive_elements: ExplorerElement[];
  dom_fingerprint: string;
  modal_context?: string | null;
  backend_requests: Array<{ url: string; method: string; post?: string | null }>;
}

export interface ExplorerEdge {
  from_state: string;
  to_state: string;
  action_type: string;
  target_element: string;
  action_description: string;
  success: boolean;
  timestamp: number;
  api_effects?: Array<{ url: string; method: string; post?: string | null }>;
  score?: number;
  safety?: string;
  safety_reason?: string;
  path?: string[];
}

export interface ExplorerGraph {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  stats: {
    total_states: number;
    total_transitions: number;
    max_depth?: number;
    max_actions_per_state?: number;
    filtered_actions: number;
    filtered_action_details?: Array<Record<string, unknown>>;
    success_rate: number;
  };
}

export interface ExploreJobStatus {
  status: 'queued' | 'running' | 'done' | 'error';
  progress?: string | null;
  graph?: ExplorerGraph | null;
  error?: string | null;
}
