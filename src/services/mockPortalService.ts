import type {
  ClaimCaseOption,
  ClaimSummary,
  DashboardSummary,
  PendingTaskSummary,
  PolicySummary,
  ServiceRequestSummary,
  UserProfile
} from '../types/portal';

export const userProfile: UserProfile = {
  name: 'Sophia Grant',
  email: 'sophia.grant@example.com',
  memberSince: '2019'
};

export const policies: PolicySummary[] = [
  {
    id: 'pol-auto-1',
    type: 'Auto',
    policyNumber: 'GI-AUTO-10482',
    title: 'Family Auto Complete',
    status: 'Active',
    premium: '$128/mo',
    renewalDate: 'Aug 18, 2026',
    coveredAsset: '2023 Toyota Highlander',
    deductible: '$500',
    documentURL: 'https://your-storage-account.blob.core.windows.net/policy-documents/Auto_Policy.pdf',
    documentId: 'Auto_Policy.pdf'
  },
  {
    id: 'pol-home-1',
    type: 'Home',
    policyNumber: 'GI-HOME-55210',
    title: 'Homeowners Plus',
    status: 'Renewal due',
    premium: '$92/mo',
    renewalDate: 'Jul 03, 2026',
    coveredAsset: 'Primary residence',
    deductible: '$1,000',
    documentURL: 'https://your-storage-account.blob.core.windows.net/policy-documents/Homeowners_Policy.pdf',
    documentId: 'Homeowners_Policy.pdf'
  },
  {
    id: 'pol-health-1',
    type: 'Health',
    policyNumber: 'GI-HEALTH-88143',
    title: 'Health Choice Gold',
    status: 'Active',
    premium: '$246/mo',
    renewalDate: 'Jan 01, 2027',
    coveredAsset: 'Household plan',
    deductible: '$750',
    documentURL: 'https://your-storage-account.blob.core.windows.net/policy-documents/Health_Policy.pdf',
    documentId: 'Health_Policy.pdf'
  }
];

export const claims: ClaimSummary[] = [
  {
    id: 'clm-1',
    claimNumber: 'CLM-240918',
    policyNumber: 'GI-AUTO-10482',
    title: 'Rear bumper repair',
    status: 'Under review',
    lastUpdated: 'Jun 02, 2026',
    amount: '$2,450',
    assignedTeam: 'Auto claims'
  },
  {
    id: 'clm-2',
    claimNumber: 'CLM-240771',
    policyNumber: 'GI-HOME-55210',
    title: 'Kitchen water damage',
    status: 'Action needed',
    lastUpdated: 'May 28, 2026',
    amount: '$6,900',
    assignedTeam: 'Property claims'
  },
  {
    id: 'clm-3',
    claimNumber: 'CLM-239401',
    policyNumber: 'GI-HEALTH-88143',
    title: 'Specialist consultation',
    status: 'Approved',
    lastUpdated: 'May 12, 2026',
    amount: '$380',
    assignedTeam: 'Health claims'
  }
];

export const claimCaseOptions: ClaimCaseOption[] = [
  {
    id: 'claim-health',
    label: 'Health claim',
    description: 'Submit treatment, consultation, and reimbursement claims.',
    caseTypeId: 'IH-Insure-Work-HealthClaims'
  },
  {
    id: 'claim-motor',
    label: 'Motor claim',
    description: 'Report vehicle accidents, damage, and repair claims.',
    caseTypeId: 'IH-Insure-Work-MotorClaims'
  },
  {
    id: 'claim-complaint',
    label: 'Complaint',
    description: 'Raise a complaint about service, coverage, or claim handling.',
    caseTypeId: 'IH-Insure-Work-Complaint'
  }
];

export const serviceRequests: ServiceRequestSummary[] = [
  {
    id: 'srv-address',
    title: 'Change address',
    description: 'Update correspondence and insured-location details.',
    status: 'Available',
    caseTypeId: 'IH-Insure-Work-ChangeAddress'
  },
  {
    id: 'srv-contact',
    title: 'Update contact details',
    description: 'Change phone, email, and communication preferences.',
    status: 'Available',
    caseTypeId: 'IH-Insure-Work-ChangeContactDetails'
  },
  {
    id: 'srv-review',
    title: 'Coverage review',
    description: 'Schedule a consultation with an insurance specialist.',
    status: 'Pending',
    caseTypeId: 'IH-Insure-Work-ScheduleConsultation',
    dueDate: 'Jun 14, 2026'
  }
];

export const pendingTasks: PendingTaskSummary[] = [
  {
    id: 'task-review',
    assignmentId: 'CASE-MOCK-1',
    caseId: 'IH-INSURE-WORK C-1001',
    title: 'Coverage review',
    status: 'Pending-CustomerAction',
    lastUpdated: 'Jun 14, 2026',
    caseTypeId: 'IH-Insure-Work-ScheduleConsultation'
  }
];

export const dashboardSummary: DashboardSummary = {
  activePolicies: policies.filter((policy) => policy.status === 'Active').length,
  openClaims: claims.filter((claim) => claim.status !== 'Approved').length,
  pendingTasks: pendingTasks.length,
  nextPayment: '$466 due Jun 20'
};
