import { getPegaConfig } from '../config/pegaConfig';
import type { PegaRuntimeConfig, PegaToken } from '../types/pega';
import type {
  ClaimCaseOption,
  ClaimSummary,
  DashboardSummary,
  PendingTaskSummary,
  PolicySummary,
  ServiceRequestSummary,
  UserProfile
} from '../types/portal';
import { claimCaseOptions, claims, dashboardSummary, pendingTasks, policies, serviceRequests, userProfile } from './mockPortalService';
import { PegaDxClient } from './pegaDxClient';

export interface PortalSnapshot {
  user: UserProfile;
  summary: DashboardSummary;
  policies: PolicySummary[];
  claims: ClaimSummary[];
  pendingTasks: PendingTaskSummary[];
  claimCaseOptions: ClaimCaseOption[];
  serviceRequests: ServiceRequestSummary[];
  pegaConfigured: boolean;
}

type AnyRecord = Record<string, unknown>;

const asRecord = (value: unknown): AnyRecord => (value && typeof value === 'object' ? (value as AnyRecord) : {});

const text = (record: AnyRecord, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return fallback;
};

const numberText = (value: unknown, fallback = 'N/A') => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  }

  if (value !== undefined && value !== null && String(value).trim()) return String(value);
  return fallback;
};

const extractRows = (response: unknown): AnyRecord[] => {
  if (Array.isArray(response)) return response.map(asRecord);

  const root = asRecord(response);
  const data = asRecord(root.data);

  for (const candidate of [root.pxResults, root.results, root.data, data.pxResults, data.results, data.data]) {
    if (Array.isArray(candidate)) return candidate.map(asRecord);
  }

  const nestedRows = findFirstRecordArray(root);
  if (nestedRows.length > 0) return nestedRows;

  if (Object.keys(data).length > 0) return [data];
  if (Object.keys(root).length > 0) return [root];

  return [];
};

const looksLikeRow = (value: unknown) => {
  const record = asRecord(value);
  return Boolean(
    record.pyAssignmentStatus ||
      record.pyStatusWork ||
      record.pxTaskLabel ||
      record.pxRefObjectClass ||
      record.pxRefObjectKey ||
      record.pzInsKey ||
      record.pxInsKey
  );
};

const findFirstRecordArray = (value: unknown): AnyRecord[] => {
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray(value)) {
    return value.some(looksLikeRow) ? value.map(asRecord) : [];
  }

  for (const child of Object.values(value as AnyRecord)) {
    const rows = findFirstRecordArray(child);
    if (rows.length > 0) return rows;
  }

  return [];
};

const extractResultCount = (response: unknown, fallbackRows: AnyRecord[]) => {
  const root = asRecord(response);
  const data = asRecord(root.data);
  const rawCount = root.resultCount ?? root.pxResultCount ?? root.count ?? data.resultCount ?? data.pxResultCount;
  const count = Number(rawCount);
  return Number.isFinite(count) ? count : fallbackRows.length;
};

const normalizePolicyType = (value: string): PolicySummary['type'] => {
  if (value.toLowerCase().includes('home')) return 'Home';
  if (value.toLowerCase().includes('health')) return 'Health';
  if (value.toLowerCase().includes('life') || value.toLowerCase().includes('protection') || value.toLowerCase().includes('income')) return 'Life';
  return 'Auto';
};

const normalizePolicyStatus = (value: string): PolicySummary['status'] => {
  const normalized = value.toLowerCase();
  if (normalized.includes('renew')) return 'Renewal due';
  if (normalized.includes('pend')) return 'Pending';
  return 'Active';
};

const normalizeClaimStatus = (value: string): ClaimSummary['status'] => {
  const normalized = value.toLowerCase();
  if (normalized.includes('action')) return 'Action needed';
  if (normalized.includes('approve')) return 'Approved';
  if (normalized.includes('reject')) return 'Rejected';
  if (normalized.includes('submit')) return 'Submitted';
  return 'Under review';
};

const normalizeServiceStatus = (value: string): ServiceRequestSummary['status'] => {
  const normalized = value.toLowerCase();
  if (normalized.includes('action')) return 'Action needed';
  if (normalized.includes('pend')) return 'Pending';
  return 'Available';
};

const getRawCaseStatus = (row: AnyRecord) =>
  text(row, ['pyAssignmentStatus', 'pyStatusWork', 'status', 'Status', 'pyStatus', 'CaseStatus']);

export const isCustomerActionStatus = (status: string) => {
  const normalized = status.trim().toLowerCase();
  return normalized === 'pending-customeraction' || normalized === 'open-customeraction';
};

const isPendingCustomerActionTask = (row: AnyRecord) => getRawCaseStatus(row).trim().toLowerCase() === 'pending-customeraction';

const isOpenableCustomerActionTask = (row: AnyRecord) => isCustomerActionStatus(getRawCaseStatus(row));

const mapPolicies = (rows: AnyRecord[]): PolicySummary[] =>
  rows.map((row, index) => ({
    id: text(row, ['id', 'ID', 'pyID', 'PolicyID', 'policyID'], `policy-${index}`),
    type: normalizePolicyType(text(row, ['type', 'Type', 'PolicyType', 'policyType', 'pyPolicyType', 'PolicyName', 'PolicyPlan'], 'Auto')),
    policyNumber: text(row, ['policyNumber', 'PolicyNumber', 'pyPolicyNumber', 'PolicyID', 'pyID'], `POL-${index + 1}`),
    title: text(row, ['title', 'Title', 'pyLabel', 'PolicyName', 'name', 'Name'], 'Insurance policy'),
    status: normalizePolicyStatus(text(row, ['status', 'Status', 'PolicyStatus', 'pyStatusWork', 'pyStatus'], 'Active')),
    premium: numberText(row.PremiumAmount ?? row.premium ?? row.Premium ?? row.MonthlyPremium ?? row.pyPremium),
    renewalDate: text(row, ['renewalDate', 'RenewalDate', 'ExpirationDate', 'pyRenewalDate'], 'N/A'),
    coveredAsset: text(row, ['coveredAsset', 'CoveredAsset', 'PolicyPlan', 'Asset', 'pyCoveredAsset'], 'Customer policy'),
    deductible: numberText(row.CoverageAmount ?? row.deductible ?? row.Deductible ?? row.pyDeductible),
    documentURL: text(row, ['DocumentURL', 'documentURL', 'DocumentUrl', 'documentUrl', 'PolicyDocumentURL', 'documentURL']),
    documentId: text(row, ['DocumentID', 'documentID', 'DocumentId', 'documentId']) || extractDocumentIdFromUrl(text(row, ['DocumentURL', 'documentURL', 'DocumentUrl', 'documentUrl']))
  }));

function extractDocumentIdFromUrl(url?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || url;
  } catch {
    return url;
  }
}

const mapClaims = (rows: AnyRecord[]): ClaimSummary[] =>
  rows.map((row, index) => ({
    id: text(row, ['id', 'ID', 'pyID', 'ClaimID', 'claimID'], `claim-${index}`),
    claimNumber: text(row, ['claimNumber', 'ClaimNumber', 'ClaimID', 'pyClaimNumber', 'pyID'], `CLM-${index + 1}`),
    policyNumber: text(row, ['policyNumber', 'PolicyNumber', 'pyPolicyNumber'], 'N/A'),
    title: text(row, ['title', 'Title', 'ClaimName', 'pyLabel', 'name', 'Name'], 'Insurance claim'),
    status: normalizeClaimStatus(text(row, ['status', 'Status', 'ClaimStatus', 'pyStatusWork', 'pyStatus'], 'Under review')),
    lastUpdated: text(row, ['lastUpdated', 'LastUpdated', 'ClaimFilingDate', 'pxUpdateDateTime', 'pxCreateDateTime'], 'N/A'),
    amount: numberText(row.ClaimAmount ?? row.amount ?? row.Amount ?? row.pyAmount),
    assignedTeam: text(row, ['assignedTeam', 'AssignedTeam', 'ClaimantName', 'pxAssignedOperator', 'pyAssignedTo'], 'Claims'),
    reason: text(row, ['ClaimReason', 'reason', 'Reason', 'pyReason'])
  }));

const mapServiceRequests = (rows: AnyRecord[]): ServiceRequestSummary[] =>
  rows.map((row, index) => ({
    id: text(row, ['id', 'ID', 'pyID', 'ServiceID', 'serviceID'], `service-${index}`),
    title: text(row, ['title', 'Title', 'pyLabel', 'name', 'Name'], 'Service request'),
    description: text(row, ['description', 'Description', 'pyDescription', 'pyInstructions'], 'Customer service task'),
    status: normalizeServiceStatus(text(row, ['status', 'Status', 'pyStatusWork', 'pyStatus'], 'Available')),
    caseTypeId: text(row, ['caseTypeId', 'CaseTypeID', 'pyClassName'], 'Org-App-Work-ServiceRequest'),
    dueDate: text(row, ['dueDate', 'DueDate', 'pyDueDate'])
  }));

const mapPendingTasks = (rows: AnyRecord[]): PendingTaskSummary[] =>
  rows.filter(isPendingCustomerActionTask).map((row, index) => mapPendingTask(row, index));

const mapOpenableCustomerActionRows = (rows: AnyRecord[]): PendingTaskSummary[] =>
  rows.filter(isOpenableCustomerActionTask).map((row, index) => mapPendingTask(row, index));

const mapPendingTask = (row: AnyRecord, index: number): PendingTaskSummary => {
    const caseId = text(row, ['pyID', 'caseId', 'caseID', 'CaseID', 'pxRefObjectKey', 'pzInsKey', 'ID'], `pending-${index + 1}`);
    const assignmentId = text(row, ['pxInsKey', 'pzInsKey', 'pxAssignmentKey', 'assignmentID', 'AssignmentID', 'ID'], caseId);
    return {
      id: assignmentId || caseId || `pending-${index + 1}`,
      assignmentId,
      caseId,
      title: text(row, ['pxTaskLabel', 'pxRefObjectInsName', 'title', 'Title', 'pyLabel', 'name', 'Name', 'CaseName'], 'Pending customer action'),
      status: getRawCaseStatus(row),
      lastUpdated: text(row, ['lastUpdated', 'LastUpdated', 'pxUpdateDateTime', 'pxCreateDateTime', 'dueDate', 'DueDate'], 'N/A'),
      caseTypeId: text(row, ['pxRefObjectClass', 'pxRefObjectType', 'caseTypeId', 'CaseTypeID', 'pyClassName', 'caseTypeID'], 'N/A')
    };
  };

export const mapPendingCustomerActionTasks = (response: unknown) => mapPendingTasks(extractRows(response));

export const mapOpenableCustomerActionTasks = (response: unknown) => mapOpenableCustomerActionRows(extractRows(response));

export const loadPendingTasksFromPcore = async (): Promise<PendingTaskSummary[]> => {
  const PCore = window.PCore;
  if (!PCore?.getDataPageUtils?.()?.getDataAsync) return [];

  const response = await PCore.getDataPageUtils().getDataAsync('D_pyMyWorkList', 'app/primary_1');
  const tasks = mapPendingCustomerActionTasks(response);

  console.log('[Pega PCore] Pending customer action tasks', {
    response,
    count: tasks.length,
    tasks
  });

  return tasks;
};

export const loadOpenableCustomerActionTasksFromPcore = async (): Promise<PendingTaskSummary[]> => {
  const PCore = window.PCore;
  if (!PCore?.getDataPageUtils?.()?.getDataAsync) return [];

  const response = await PCore.getDataPageUtils().getDataAsync('D_pyMyWorkList', 'app/primary_1');
  const tasks = mapOpenableCustomerActionTasks(response);

  console.log('[Pega PCore] Openable customer action tasks', {
    response,
    count: tasks.length,
    tasks
  });

  return tasks;
};

const buildSummary = (
  policyRows: PolicySummary[],
  claimRows: ClaimSummary[],
  serviceRows: ServiceRequestSummary[],
  pendingTaskRows: PendingTaskSummary[],
  dashboardRows: AnyRecord[],
  counts?: {
    policies?: number;
    claims?: number;
  }
): DashboardSummary => {
  const dashboard = dashboardRows[0] || {};
  return {
    activePolicies: Number(
      text(dashboard, ['activePolicies', 'ActivePolicies', 'PolicyCount', 'pyPolicyCount'], String(counts?.policies ?? policyRows.length))
    ),
    openClaims: Number(
      text(
        dashboard,
        ['openClaims', 'OpenClaims', 'ClaimCount', 'OpenClaimCount', 'pyClaimCount'],
        String(counts?.claims ?? claimRows.length)
      )
    ),
    pendingTasks: pendingTaskRows.length,
    nextPayment: text(dashboard, ['nextPayment', 'NextPayment', 'NextPremium', 'PaymentDue', 'pyNextPayment'], dashboardSummary.nextPayment)
  };
};

const buildUserProfile = (customerId: string, dashboardRows: AnyRecord[]): UserProfile => {
  const dashboard = dashboardRows[0] || {};
  const customerName = text(
    dashboard,
    ['CustomerName', 'customerName', 'pyCustomerName', 'pyFullName', 'FullName', 'Name', 'pyLabel'],
    customerId
  );
  const customerSince = text(
    dashboard,
    ['CustomerSince', 'customerSince', 'MemberSince', 'memberSince', 'pyCustomerSince', 'SinceDate', 'pxCreateDateTime'],
    'Pega'
  );
  const email = text(dashboard, ['Email', 'email', 'pyEmailAddress', 'EmailAddress'], customerId);

  return {
    name: customerName,
    email,
    memberSince: customerSince
  };
};

export const buildCustomerParameters = (config: PegaRuntimeConfig, customerId: string) => ({
  [config.customerIdParam]: customerId
});

export const buildCustomerCaseContent = (_config: PegaRuntimeConfig, customerId: string, _content: AnyRecord = {}) => ({
  IsSelfServe: true,
  CustomerID: customerId,
});

export const getPortalSnapshot = (customerId?: string): PortalSnapshot => ({
  user: customerId
    ? {
        name: customerId,
        email: customerId,
        memberSince: 'Pega'
      }
    : userProfile,
  summary: customerId ? { ...dashboardSummary, pendingTasks: 0 } : dashboardSummary,
  policies,
  claims,
  pendingTasks: customerId ? [] : pendingTasks,
  claimCaseOptions,
  serviceRequests,
  pegaConfigured: getPegaConfig() !== null
});

export const createDxClient = (token?: PegaToken) => {
  const config = getPegaConfig();
  return config ? new PegaDxClient(config, token) : null;
};

export const createApiDxClient = () => {
  const config = getPegaConfig();
  if (!config) return null;

  return new PegaDxClient({
    ...config,
    auth: config.apiAuth || config.auth
  });
};

export const loadCustomerPortalSnapshot = async (token: PegaToken, customerId: string): Promise<PortalSnapshot> => {
  const config = getPegaConfig();
  if (!config) return getPortalSnapshot(customerId);

  const client = new PegaDxClient(config, token);
  const parameters = buildCustomerParameters(config, customerId);

  const [policyResponse, claimResponse, serviceResponse, worklistResponse, dashboardResponse] = await Promise.allSettled([
    config.dataViews.policies ? client.getDataView(config.dataViews.policies, { dataViewParameters: parameters }) : null,
    config.dataViews.claims ? client.getDataView(config.dataViews.claims, { dataViewParameters: parameters }) : null,
    config.dataViews.serviceTasks ? client.getDataView(config.dataViews.serviceTasks, { dataViewParameters: parameters }) : null,
    client.getDataView('D_pyMyWorkList'),
    config.dataViews.dashboard ? client.getDataView(config.dataViews.dashboard, { dataViewParameters: parameters }) : null
  ]);

  const loadedPolicies =
    policyResponse.status === 'fulfilled' && policyResponse.value ? mapPolicies(extractRows(policyResponse.value)) : policies;
  const rawClaimRows = claimResponse.status === 'fulfilled' && claimResponse.value ? extractRows(claimResponse.value) : [];
  const rawServiceRows = serviceResponse.status === 'fulfilled' && serviceResponse.value ? extractRows(serviceResponse.value) : [];
  const rawWorklistRows = worklistResponse.status === 'fulfilled' && worklistResponse.value ? extractRows(worklistResponse.value) : [];
  const loadedClaims =
    rawClaimRows.length > 0 ? mapClaims(rawClaimRows) : claims;
  const loadedServices =
    rawServiceRows.length > 0 ? mapServiceRequests(rawServiceRows) : serviceRequests;
  const loadedPendingTasks = mapPendingTasks([...rawWorklistRows, ...rawServiceRows, ...rawClaimRows]);
  const loadedDashboardRows =
    dashboardResponse.status === 'fulfilled' && dashboardResponse.value ? extractRows(dashboardResponse.value) : [];
  const counts = {
    policies:
      policyResponse.status === 'fulfilled' && policyResponse.value
        ? extractResultCount(policyResponse.value, extractRows(policyResponse.value))
        : policies.length,
    claims:
      claimResponse.status === 'fulfilled' && claimResponse.value
        ? extractResultCount(claimResponse.value, extractRows(claimResponse.value))
        : claims.length,
  };

  if (config.dataViews.dashboard) {
    if (dashboardResponse.status === 'fulfilled') {
      console.log('[Pega DX] Dashboard data view response', {
        dataViewId: config.dataViews.dashboard,
        customerId,
        response: dashboardResponse.value,
        mappedRows: loadedDashboardRows
      });
    } else {
      console.warn('[Pega DX] Dashboard data view failed', {
        dataViewId: config.dataViews.dashboard,
        customerId,
        error: dashboardResponse.reason
      });
    }
  }

  return {
    user: buildUserProfile(customerId, loadedDashboardRows),
    summary: buildSummary(
      loadedPolicies,
      loadedClaims,
      loadedServices,
      loadedPendingTasks,
      loadedDashboardRows,
      counts
    ),
    policies: loadedPolicies.length > 0 ? loadedPolicies : policies,
    claims: loadedClaims.length > 0 ? loadedClaims : claims,
    pendingTasks: loadedPendingTasks,
    claimCaseOptions,
    serviceRequests: loadedServices.length > 0 ? loadedServices : serviceRequests,
    pegaConfigured: true
  };
};
