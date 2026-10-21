export type PortalTab = 'dashboard' | 'policies' | 'claims' | 'services';

export interface UserProfile {
  name: string;
  email: string;
  memberSince: string;
}

export interface PolicySummary {
  id: string;
  type: 'Auto' | 'Home' | 'Health' | 'Life';
  policyNumber: string;
  title: string;
  status: 'Active' | 'Renewal due' | 'Pending';
  premium: string;
  renewalDate: string;
  coveredAsset: string;
  deductible: string;
  documentURL?: string;
  documentId?: string;
}

export interface ClaimSummary {
  id: string;
  claimNumber: string;
  policyNumber: string;
  title: string;
  status: 'Submitted' | 'Under review' | 'Action needed' | 'Approved' | 'Rejected';
  lastUpdated: string;
  amount: string;
  assignedTeam: string;
  reason?: string;
}

export interface ClaimCaseOption {
  id: string;
  label: string;
  description: string;
  caseTypeId: string;
}

export interface ServiceRequestSummary {
  id: string;
  title: string;
  description: string;
  status: 'Available' | 'Pending' | 'Action needed';
  caseTypeId: string;
  dueDate?: string;
}

export interface PendingTaskSummary {
  id: string;
  assignmentId: string;
  caseId: string;
  title: string;
  status: string;
  lastUpdated: string;
  caseTypeId: string;
}

export interface DashboardSummary {
  activePolicies: number;
  openClaims: number;
  pendingTasks: number;
  nextPayment: string;
}
