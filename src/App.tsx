import { Alert, Box, Button, Dialog, DialogContent, Snackbar, Typography } from '@mui/material';
import { sdkSetAuthHeader } from '@pega/auth/lib/sdk-auth-manager';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { useBrand } from './branding/BrandProvider';
import { AppShell } from './components/AppShell';
import { PolicyAIChat } from './components/PolicyAIChat';
import { WebEmbedModal } from './components/WebEmbedModal';
import { getPegaConfig } from './config/pegaConfig';
import { DashboardPage } from './pages/DashboardPage';
import { ClaimsPage } from './pages/ClaimsPage';
import { LoginPage } from './pages/LoginPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ServicesPage } from './pages/ServicesPage';
import { loginWithPega } from './services/authService';
import { installPegaRenderDiagnostics } from './services/pegaRenderDiagnostics';
import {
  buildCustomerCaseContent,
  createDxClient,
  getPortalSnapshot,
  isCustomerActionStatus,
  loadOpenableCustomerActionTasksFromPcore,
  loadPendingTasksFromPcore,
  loadCustomerPortalSnapshot
} from './services/portalDataService';
import { useConstellation } from './hooks/useConstellation';
import { createCaseInConstellation, openAssignmentInConstellation } from './lib/constellation';
import type { PegaToken } from './types/pega';
import type { ClaimCaseOption, PendingTaskSummary, PolicySummary, PortalTab, ServiceRequestSummary } from './types/portal';

const tabPath: Record<PortalTab, string> = {
  dashboard: '/dashboard',
  policies: '/policies',
  claims: '/claims',
  services: '/services'
};

const tabFromPath = (pathname: string): PortalTab => {
  if (pathname.startsWith('/policies')) return 'policies';
  if (pathname.startsWith('/claims')) return 'claims';
  if (pathname.startsWith('/services')) return 'services';
  return 'dashboard';
};

const getPegaAuthHeader = (token?: PegaToken) => {
  if (!token?.accessToken) return null;
  return `${token.tokenType || 'Bearer'} ${token.accessToken}`;
};

const findNestedString = (value: unknown, keys: string[]): string => {
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = record[key];
    if (typeof direct === 'string' && direct.trim()) return direct;
  }

  for (const child of Object.values(record)) {
    const nested = findNestedString(child, keys);
    if (nested) return nested;
  }

  return '';
};

const getNextAssignmentIdFromResponse = (value: unknown) => {
  const response = value as any;
  const explicitNext =
    findNestedString(response?.nextAssignmentInfo, ['ID', 'id']) ||
    findNestedString(response?.data?.nextAssignmentInfo, ['ID', 'id']) ||
    findNestedString(response, ['nextAssignmentID']);

  if (explicitNext) return explicitNext;

  const nestedAssignmentId = findNestedString(response, ['assignmentID', 'AssignmentID']);
  if (nestedAssignmentId) return nestedAssignmentId;

  const genericId = findNestedString(response, ['ID', 'id']);
  return genericId.startsWith('ASSIGN-') ? genericId : '';
};

const getCustomerActionStatusFromResponse = (value: unknown) =>
  findNestedString(value, ['pyAssignmentStatus', 'pyStatusWork', 'status', 'Status', 'pyStatus', 'CaseStatus']);

const SESSION_STORAGE_KEY = 'pegaStarter.pegaSession';

const getPegaConnectionKey = () => {
  const config = getPegaConfig();
  if (!config) return '';

  return `${config.baseUrl.replace(/\/$/, '')}|${config.appAlias || ''}`;
};

interface StoredPegaSession {
  token: PegaToken;
  customerId: string;
  connectionKey: string;
}

const loadStoredSession = (): StoredPegaSession | null => {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as StoredPegaSession;
    if (
      !session?.token?.accessToken ||
      !session.customerId ||
      session.connectionKey !== getPegaConnectionKey() ||
      session.token.expiresAt <= Date.now()
    ) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

const storeSession = (session: StoredPegaSession) => {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

const clearStoredSession = () => {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

function App() {
  const [storedSession] = useState(() => loadStoredSession());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(storedSession));
  const [authToken, setAuthToken] = useState<PegaToken | undefined>(() => storedSession?.token);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(() => storedSession?.customerId || null);
  const [snapshot, setSnapshot] = useState(() => getPortalSnapshot(storedSession?.customerId));
  const [toast, setToast] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [pegaRenderError, setPegaRenderError] = useState<string | null>(null);
  const [startingServiceId, setStartingServiceId] = useState<string | null>(null);
  const [startingClaimId, setStartingClaimId] = useState<string | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<{ assignmentID: string } | null>(null);
  const [webEmbedOpen, setWebEmbedOpen] = useState(false);
  const activeAssignmentRef = useRef<{ assignmentID: string } | null>(null);
  const assignmentTransitionSeq = useRef(0);
  const suppressTransitionCloseUntil = useRef(0);
  const [aiPolicy, setAiPolicy] = useState<import('./types/portal').PolicySummary | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pegaConfig = getPegaConfig();
  const pegaConfigured = pegaConfig !== null;
  const isPegaReady = useConstellation(isAuthenticated && pegaConfigured);
  const activeTab = tabFromPath(location.pathname);
  const { brand } = useBrand();

  useEffect(() => {
    return installPegaRenderDiagnostics(setPegaRenderError);
  }, []);

  useEffect(() => {
    activeAssignmentRef.current = activeAssignment;
  }, [activeAssignment]);

  useEffect(() => {
    if (!isAuthenticated || !authToken || !customerId) return;

    void loadCustomerPortalSnapshot(authToken, customerId)
      .then(setSnapshot)
      .catch((error) => {
        clearStoredSession();
        setAuthToken(undefined);
        setCustomerId(null);
        setSnapshot(getPortalSnapshot());
        setIsAuthenticated(false);
        setToast(
          error instanceof Error
            ? `Saved Pega session could not be restored: ${error.message}`
            : 'Saved Pega session could not be restored.'
        );
      });
  }, [isAuthenticated, authToken, customerId]);

  const runPegaAction = async (action: () => Promise<unknown>, successMessage: string) => {
    if (!pegaConfigured) {
      setToast('Pega DX API is not configured yet. Add .env values to enable this action.');
      return;
    }

    try {
      await action();
      setToast(successMessage);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Pega action failed.');
    }
  };

  const refreshPendingTasks = async () => {
    const pendingTasks = await loadPendingTasksFromPcore();
    setSnapshot((current) => ({
      ...current,
      pendingTasks,
      summary: {
        ...current.summary,
        pendingTasks: pendingTasks.length
      }
    }));
    return pendingTasks;
  };

  const showSubmittedNotice = () => {
    setActiveAssignment(null);
    setSubmissionNotice('Your case has been submitted for further processing.');
  };

  const handleAssignmentActionResponse = async (body: unknown, source: string) => {
    const nextAssignmentId = getNextAssignmentIdFromResponse(body);
    const nextStatus = getCustomerActionStatusFromResponse(body);

    console.log(`[Pega DX] Assignment action response gate (${source})`, {
      nextAssignmentId,
      nextStatus,
      body
    });

    ++assignmentTransitionSeq.current;
    await refreshPendingTasks().catch((error) => {
      console.warn('[Pega PCore] Pending task refresh after action response failed', error);
    });

          if (nextAssignmentId && isCustomerActionStatus(nextStatus)) {
            suppressTransitionCloseUntil.current = Date.now() + 3000;
            setSubmissionNotice(null);
            setActiveAssignment({ assignmentID: nextAssignmentId });
      await openAssignmentInConstellation(nextAssignmentId).catch((error) => {
        setActiveAssignment(null);
        setToast(error instanceof Error ? error.message : 'Unable to open next customer action.');
      });
      return;
    }

          if (nextStatus && !isCustomerActionStatus(nextStatus)) {
            showSubmittedNotice();
          }
  };

  useEffect(() => {
    if (!isAuthenticated || !isPegaReady) return;

    const originalFetch = window.fetch.bind(window);
    const OriginalXHR = window.XMLHttpRequest;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const isAssignmentActionSubmit =
        method !== 'GET' &&
        url.includes('/api/application/v2/assignments/') &&
        url.includes('/actions/');

      if (!isAssignmentActionSubmit || !response.ok) {
        return response;
      }

      void response
        .clone()
        .json()
        .then((body) => handleAssignmentActionResponse(body, 'fetch'))
        .catch(() => {
          // Non-JSON action responses are ignored.
        });

      return response;
    };

    const PatchedXHR = function XMLHttpRequestPatched(this: XMLHttpRequest) {
      const xhr = new OriginalXHR();
      let requestUrl = '';
      let requestMethod = 'GET';
      const originalOpen = xhr.open as any;

      (xhr as any).open = function patchedOpen(method: string, url: string | URL, ...rest: any[]) {
        requestMethod = String(method || 'GET').toUpperCase();
        requestUrl = String(url || '');
        return originalOpen.call(xhr, method, url, ...rest);
      };

      xhr.addEventListener('load', () => {
        const isAssignmentActionSubmit =
          requestMethod !== 'GET' &&
          requestUrl.includes('/api/application/v2/assignments/') &&
          requestUrl.includes('/actions/');

        if (!isAssignmentActionSubmit || xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) return;

        try {
          const body = JSON.parse(xhr.responseText);
          void handleAssignmentActionResponse(body, 'xhr');
        } catch {
          // Non-JSON action responses are ignored.
        }
      });

      return xhr;
    } as any;

    PatchedXHR.prototype = OriginalXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest = OriginalXHR;
    };
  }, [isAuthenticated, isPegaReady]);

  const getClaimCaseTypeId = (option: ClaimCaseOption) => {
    if (option.id === 'claim-motor') return pegaConfig?.caseTypes.motorClaim || option.caseTypeId;
    if (option.id === 'claim-health') return pegaConfig?.caseTypes.healthClaim || option.caseTypeId;
    return option.caseTypeId || pegaConfig?.caseTypes.claim;
  };

  const handleCreateClaim = (option: ClaimCaseOption) => {
    if (!pegaConfigured) {
      setToast('Pega DX API is not configured yet. Add .env values to enable this action.');
      return;
    }

    const PCore = window.PCore;
    if (!isPegaReady || !PCore?.getBootstrapUtils?.()?.getCaseApi) {
      setToast('Pega Constellation runtime is still loading. Try again in a moment.');
      return;
    }

    const caseTypeId = getClaimCaseTypeId(option);

    setSubmissionNotice(null);
    setStartingClaimId(option.id);
    setActiveAssignment({ assignmentID: 'NEW_CASE' });
    setPegaRenderError(null);

    void (async () => {
      try {
        const authHeader = getPegaAuthHeader(authToken);
        if (authHeader) {
          sdkSetAuthHeader(authHeader);
        }

        if (!caseTypeId) throw new Error('Claim case type is not configured.');
        if (!pegaConfig || !customerId) throw new Error('Customer ID is not available for this Pega request.');

        await createCaseInConstellation(caseTypeId, buildCustomerCaseContent(pegaConfig, customerId));
        setToast(`${option.label} case started in Pega.`);
      } catch (error) {
        setActiveAssignment(null);
        setToast(error instanceof Error ? error.message : 'Unable to start Pega claim.');
      } finally {
        setStartingClaimId(null);
      }
    })();
  };

  const handlePolicyChange = (policy: PolicySummary) => {
    const client = createDxClient(authToken);
    const caseTypeId = pegaConfig?.caseTypes.policyChange;
    void runPegaAction(async () => {
      if (!client || !caseTypeId) throw new Error('Policy change case type is not configured.');
      if (!pegaConfig || !customerId) throw new Error('Customer ID is not available for this Pega request.');
      return client.createCase(
        caseTypeId,
        buildCustomerCaseContent(pegaConfig, customerId, { policyNumber: policy.policyNumber })
      );
    }, 'Policy change request created in Pega.');
  };

  const handleStartService = (request: ServiceRequestSummary) => {
    if (!pegaConfigured) {
      setToast('Pega DX API is not configured yet. Add .env values to enable this action.');
      return;
    }

    if (request.id === 'srv-contact') {
      if (!customerId) {
        setToast('Customer ID is not available for this Pega request.');
        return;
      }

      setSubmissionNotice(null);
      setPegaRenderError(null);
      setActiveAssignment(null);
      setWebEmbedOpen(true);
      return;
    }

    const PCore = window.PCore;
    if (!isPegaReady || !PCore?.getBootstrapUtils?.()?.getCaseApi) {
      setToast('Pega Constellation runtime is still loading. Try again in a moment.');
      return;
    }

    const caseTypeId = request.id === 'srv-address' ? pegaConfig?.caseTypes.changeAddress || request.caseTypeId : request.caseTypeId;

    setSubmissionNotice(null);
    setStartingServiceId(request.id);
    setActiveAssignment({ assignmentID: 'NEW_CASE' });
    setPegaRenderError(null);

    void (async () => {
      try {
        const authHeader = getPegaAuthHeader(authToken);
        if (authHeader) {
          sdkSetAuthHeader(authHeader);
        }

        if (!pegaConfig || !customerId) throw new Error('Customer ID is not available for this Pega request.');

        if (request.id === 'srv-address') {
          await createCaseInConstellation(
            caseTypeId,
            buildCustomerCaseContent(pegaConfig, customerId, {
              requestType: request.title,
              source: 'Constellation Starter portal'
            })
          );
          setToast(`${request.title} case started in Pega.`);
          return;
        }

        const client = createDxClient(authToken);
        if (!client) throw new Error('Pega DX API is not configured for this request.');

        await client.createCase(
          caseTypeId,
          buildCustomerCaseContent(pegaConfig, customerId, {
            requestType: request.title,
            source: 'Constellation Starter portal'
          })
        );

        setActiveAssignment(null);
        setToast(`${request.title} case started in Pega.`);
      } catch (error) {
        setActiveAssignment(null);
        setToast(error instanceof Error ? error.message : 'Unable to start Pega case.');
      } finally {
        setStartingServiceId(null);
      }
    })();
  };

  const handleOpenPendingTask = (task: PendingTaskSummary) => {
    const assignmentId = task.assignmentId || task.id;

    if (!assignmentId) {
      setToast('Pending task is missing an assignment id.');
      return;
    }

    if (!isPegaReady || !window.PCore) {
      setToast('Pega Constellation runtime is still loading. Try again in a moment.');
      return;
    }

    setSubmissionNotice(null);
    setActiveAssignment({ assignmentID: assignmentId });
    setPegaRenderError(null);

    window.setTimeout(() => {
      void openAssignmentInConstellation(assignmentId).catch((error) => {
        setActiveAssignment(null);
        setToast(error instanceof Error ? error.message : 'Unable to open pending task.');
      });
    }, 100);
  };

  useEffect(() => {
    if (!isPegaReady || !window.PCore) return;

    const PCore = window.PCore;

    const closeAssignment = () => {
      setActiveAssignment(null);
    };

    const getEventStatus = (eventData: any) =>
      String(
        eventData?.pyAssignmentStatus ||
          eventData?.pyStatusWork ||
          eventData?.status ||
          eventData?.caseInfo?.pyAssignmentStatus ||
          eventData?.caseInfo?.pyStatusWork ||
          eventData?.caseInfo?.status ||
          eventData?.caseInfo?.assignments?.[0]?.pyAssignmentStatus ||
          eventData?.caseInfo?.assignments?.[0]?.pyStatusWork ||
          eventData?.caseInfo?.assignments?.[0]?.status ||
          eventData?.data?.pyAssignmentStatus ||
          eventData?.data?.pyStatusWork ||
          eventData?.data?.status ||
          ''
      );

    const getEventAssignmentId = (eventData: any) =>
      eventData?.nextAssignmentID ||
      eventData?.nextAssignmentInfo?.ID ||
      eventData?.nextAssignmentInfo?.id ||
      eventData?.assignmentID ||
      eventData?.ID ||
      eventData?.data?.nextAssignmentID ||
      eventData?.data?.nextAssignmentInfo?.ID ||
      eventData?.data?.nextAssignmentInfo?.id ||
      eventData?.caseInfo?.assignments?.[0]?.ID ||
      eventData?.caseInfo?.assignments?.[0]?.assignmentID;

    const matchesAssignment = (task: PendingTaskSummary, assignmentId: string) => {
      const normalizedAssignment = assignmentId.trim().toLowerCase();
      return [task.assignmentId, task.id, task.caseId].some((value) => value.trim().toLowerCase() === normalizedAssignment);
    };

    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const handleAssignmentTransition = (event: any, source: string) => {
      const eventData = event?.data || event;
      const nextAssignmentId = getEventAssignmentId(eventData);
      const nextStatus = getEventStatus(eventData);
      const transitionSeq = ++assignmentTransitionSeq.current;

      console.log(`[Pega PCore] ${source} event`, {
        nextAssignmentId,
        nextStatus,
        eventData
      });

      void (async () => {
        if (Date.now() < suppressTransitionCloseUntil.current) return;

        closeAssignment();
        await wait(1200);

        if (Date.now() < suppressTransitionCloseUntil.current) return;
        if (transitionSeq !== assignmentTransitionSeq.current) return;

        const [latestPendingTasks, latestOpenableTasks] = await Promise.all([
          refreshPendingTasks().catch((error) => {
          console.warn('[Pega PCore] Pending task refresh after assignment transition failed', error);
          return [] as PendingTaskSummary[];
          }),
          loadOpenableCustomerActionTasksFromPcore().catch((error) => {
            console.warn('[Pega PCore] Openable task refresh after assignment transition failed', error);
            return [] as PendingTaskSummary[];
          })
        ]);

        if (transitionSeq !== assignmentTransitionSeq.current) return;
        if (Date.now() < suppressTransitionCloseUntil.current) return;

        const matchingTask = nextAssignmentId
          ? latestOpenableTasks.find((task) => matchesAssignment(task, nextAssignmentId))
          : latestOpenableTasks.length === 1
            ? latestOpenableTasks[0]
            : undefined;
        const shouldShowNextAssignment = Boolean(matchingTask) || Boolean(nextAssignmentId && isCustomerActionStatus(nextStatus));

        if (!shouldShowNextAssignment) {
          showSubmittedNotice();
          return;
        }

        const assignmentIdToOpen = matchingTask?.assignmentId || nextAssignmentId;
        setSubmissionNotice(null);
        setActiveAssignment({ assignmentID: assignmentIdToOpen });
        await openAssignmentInConstellation(assignmentIdToOpen).catch((error) => {
          closeAssignment();
          setToast(error instanceof Error ? error.message : 'Unable to open next customer action.');
        });
      })();
    };

    const handleFinish = (event: any) => handleAssignmentTransition(event, 'assignmentFinished');

    const handleAssignmentSubmission = (event: any) => handleAssignmentTransition(event, 'ASSIGNMENT_SUBMISSION');

    const handleCaseCreated = (event: any) => {
      const eventData = event?.data || event;
      const assignmentId = getEventAssignmentId(eventData);
      const status = getEventStatus(eventData);

      console.log('[Pega PCore] caseCreated event', {
        assignmentId,
        status,
        eventData
      });

      const isInitialCreate = activeAssignmentRef.current?.assignmentID === 'NEW_CASE';

      if (status && !isCustomerActionStatus(status)) {
        showSubmittedNotice();
        return;
      }

      if (!status && !isInitialCreate) {
        closeAssignment();
        return;
      }

      if (assignmentId) {
        setSubmissionNotice(null);
        setActiveAssignment({ assignmentID: assignmentId });
      }
    };

    PCore.getPubSubUtils().subscribe(PCore.getConstants().PUB_SUB_EVENTS.EVENT_CANCEL, closeAssignment, 'insureHubCancel');
    PCore.getPubSubUtils().subscribe('assignmentFinished', handleFinish, 'insureHubFinish');
    PCore.getPubSubUtils().subscribe('caseCreated', handleCaseCreated, 'insureHubCaseCreated');
    PCore.getPubSubUtils().subscribe(
      PCore.getConstants().PUB_SUB_EVENTS.CASE_EVENTS.ASSIGNMENT_SUBMISSION,
      handleAssignmentSubmission,
      'insureHubAssignmentSubmission'
    );
    PCore.getPubSubUtils().subscribe(
      PCore.getConstants().PUB_SUB_EVENTS.CASE_EVENTS.END_OF_ASSIGNMENT_PROCESSING,
      (event: any) => handleAssignmentTransition(event, 'END_OF_ASSIGNMENT_PROCESSING'),
      'insureHubEndAssignmentProcessing'
    );

    return () => {
      PCore.getPubSubUtils().unsubscribe(PCore.getConstants().PUB_SUB_EVENTS.EVENT_CANCEL, 'insureHubCancel');
      PCore.getPubSubUtils().unsubscribe('assignmentFinished', 'insureHubFinish');
      PCore.getPubSubUtils().unsubscribe('caseCreated', 'insureHubCaseCreated');
      PCore.getPubSubUtils().unsubscribe(
        PCore.getConstants().PUB_SUB_EVENTS.CASE_EVENTS.ASSIGNMENT_SUBMISSION,
        'insureHubAssignmentSubmission'
      );
      PCore.getPubSubUtils().unsubscribe(
        PCore.getConstants().PUB_SUB_EVENTS.CASE_EVENTS.END_OF_ASSIGNMENT_PROCESSING,
        'insureHubEndAssignmentProcessing'
      );
    };
  }, [isPegaReady]);

  useEffect(() => {
    if (!isAuthenticated || !isPegaReady || !customerId) return;

    void loadPendingTasksFromPcore()
      .then((pendingTasks) => {
        setSnapshot((current) => ({
          ...current,
          pendingTasks,
          summary: {
            ...current.summary,
            pendingTasks: pendingTasks.length
          }
        }));
      })
      .catch((error) => {
        console.warn('[Pega PCore] Pending task load failed', error);
      });
  }, [isAuthenticated, isPegaReady, customerId]);

  if (!isAuthenticated) {
    return (
      <LoginPage
        brand={brand}
        error={loginError}
        onLogin={async (username, password) => {
          setLoginError(null);
          try {
            const session = await loginWithPega(username, password);
            const loggedInCustomerId = session.user.name;
            storeSession({
              token: session.token,
              customerId: loggedInCustomerId,
              connectionKey: getPegaConnectionKey()
            });
            setAuthToken(session.token);
            setCustomerId(loggedInCustomerId);
            setSnapshot(getPortalSnapshot(loggedInCustomerId));
            setIsAuthenticated(true);
            if (location.pathname === '/') navigate('/dashboard', { replace: true });
            void loadCustomerPortalSnapshot(session.token, loggedInCustomerId)
              .then(setSnapshot)
              .catch((error) => {
                setToast(
                  error instanceof Error
                    ? `Pega customer data load failed: ${error.message}`
                    : 'Pega customer data load failed.'
                );
              });
          } catch (error) {
            clearStoredSession();
            setAuthToken(undefined);
            setIsAuthenticated(false);
            setLoginError(error instanceof Error ? error.message : 'Pega login failed.');
          }
        }}
      />
    );
  }

  return (
    <>
      <AppShell
        brand={brand}
        activeTab={activeTab}
        onTabChange={(tab) => navigate(tabPath[tab])}
        onLogout={() => {
          clearStoredSession();
          setAuthToken(undefined);
          setCustomerId(null);
          setSnapshot(getPortalSnapshot());
          setIsAuthenticated(false);
          navigate('/', { replace: true });
        }}
        user={snapshot.user}
      >
        <div className={activeAssignment ? 'portal-route-content is-hidden' : 'portal-route-content'}>
          {submissionNotice ? (
            <Box className="submission-notice">
              <Box className="submission-notice-icon">
                <CheckCircle2 size={28} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Case submitted</Typography>
                <Typography color="text.secondary">{submissionNotice}</Typography>
              </Box>
              <Button variant="outlined" onClick={() => setSubmissionNotice(null)}>
                Dismiss
              </Button>
            </Box>
          ) : null}

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  brand={brand}
                  user={snapshot.user}
                  summary={snapshot.summary}
                  policies={snapshot.policies}
                  pendingTasks={snapshot.pendingTasks}
                  onNavigate={(tab) => navigate(tabPath[tab])}
                  onOpenPendingTask={handleOpenPendingTask}
                />
              }
            />
            <Route
              path="/policies"
              element={
                <PoliciesPage
                  brand={brand}
                  policies={snapshot.policies}
                  pegaConfigured={pegaConfigured}
                  onPolicyChange={handlePolicyChange}
                  onAskPolicyQuestion={setAiPolicy}
                />
              }
            />
            <Route
              path="/claims"
              element={
                <ClaimsPage
                  brand={brand}
                  claims={snapshot.claims}
                  claimCaseOptions={snapshot.claimCaseOptions}
                  pegaConfigured={pegaConfigured}
                  isPegaReady={isPegaReady}
                  startingClaimId={startingClaimId}
                  onCreateClaim={handleCreateClaim}
                />
              }
            />
            <Route
              path="/services"
              element={
                <ServicesPage
                  brand={brand}
                  serviceRequests={snapshot.serviceRequests}
                  pendingTasks={snapshot.pendingTasks}
                  pegaConfigured={pegaConfigured}
                  startingServiceId={startingServiceId}
                  isPegaReady={isPegaReady}
                  onStartService={handleStartService}
                  onOpenPendingTask={handleOpenPendingTask}
                />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>

        <div id="pega-root" className={activeAssignment ? 'pega-workarea is-active' : 'pega-workarea'} />
      </AppShell>

      <Snackbar open={toast !== null} autoHideDuration={5200} onClose={() => setToast(null)}>
        <Alert severity={toast?.includes('failed') || toast?.includes('not configured') ? 'warning' : 'success'} variant="filled">
          {toast}
        </Alert>
      </Snackbar>

      {pegaRenderError ? (
        <Alert
          severity="error"
          onClose={() => setPegaRenderError(null)}
          sx={{
            bottom: 88,
            left: 24,
            maxWidth: 760,
            position: 'fixed',
            whiteSpace: 'pre-wrap',
            zIndex: 1800
          }}
        >
          {pegaRenderError}
        </Alert>
      ) : null}

      <Dialog
        open={!!aiPolicy}
        onClose={() => setAiPolicy(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 4, 
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
          } 
        }}
        slotProps={{
          backdrop: {
            sx: { backgroundColor: 'rgba(0,0,0,0.6)' }
          }
        }}
      >
        <DialogContent sx={{ p: 0, height: 'min(620px, 82vh)' }}>
          {aiPolicy && (
            <PolicyAIChat
              policy={aiPolicy}
              authToken={authToken}
              customerId={customerId}
              onClose={() => setAiPolicy(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {customerId && authToken ? (
        <WebEmbedModal
          open={webEmbedOpen}
          onClose={() => setWebEmbedOpen(false)}
          customerId={customerId}
          authHeader={getPegaAuthHeader(authToken) || ''}
        />
      ) : null}
    </>
  );
}

export default App;
