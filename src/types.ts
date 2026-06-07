export type TabType = 'Dashboard' | 'App Explorer' | 'Test Cases' | 'Test Execution' | 'Failure Analysis' | 'Reports';

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
