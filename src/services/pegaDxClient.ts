import type {
  DataViewRequest,
  PegaAssignment,
  PegaAssignmentResponse,
  PegaCase,
  PegaCaseResponse,
  PegaCaseType,
  PegaViewType,
  PegaToken,
  PegaRuntimeConfig
} from '../types/pega';

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  token_type?: string;
}

export interface PegaAgentAttachment {
  ID: string;
  name: string;
  type: 'File';
  category?: string;
}

export class PegaDxClient {
  private token?: string;

  private tokenExpiresAt = 0;

  private readonly userTokenProvided: boolean;

  constructor(
    private readonly config: PegaRuntimeConfig,
    token?: PegaToken
  ) {
    this.userTokenProvided = Boolean(token);
    if (token) {
      this.token = token.accessToken;
      this.tokenExpiresAt = token.expiresAt;
    }
  }

  getApplicationApiBase() {
    const useDevProxy = import.meta.env.DEV && import.meta.env.VITE_PEGA_DEV_PROXY !== 'false';
    const root = useDevProxy ? new URL(this.config.baseUrl).pathname.replace(/\/$/, '') : this.config.baseUrl.replace(/\/$/, '');

    if (this.config.appAlias) {
      return `${root}/app/${encodeURIComponent(this.config.appAlias)}/api/application/v2`;
    }
    return `${root}/api/application/v2`;
  }

  private withQuery(path: string, params: Record<string, string | boolean | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });

    const queryText = query.toString();
    return queryText ? `${path}?${queryText}` : path;
  }

  getTokenUrl() {
    if (this.config.auth.tokenUrl) {
      return this.config.auth.tokenUrl;
    }
    return `${this.config.baseUrl.replace(/\/$/, '')}/api/oauth2/v1/token`;
  }

  async authenticate(force = false) {
    if (!force && this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    if (this.userTokenProvided) {
      throw new Error('Your Pega session has expired. Sign out and sign in again.');
    }

    const body = new URLSearchParams({
      grant_type: this.config.auth.grantType,
      client_id: this.config.auth.clientId
    });

    if (this.config.auth.clientSecret) body.set('client_secret', this.config.auth.clientSecret);
    if (this.config.auth.username) body.set('username', this.config.auth.username);
    if (this.config.auth.password) body.set('password', this.config.auth.password);

    const response = await fetch(this.getTokenUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Pega authentication failed with ${response.status}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + Math.max((data.expires_in || 300) - 30, 30) * 1000;
    return this.token;
  }

  async authenticateWithPassword(username: string, password: string): Promise<PegaToken> {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.config.auth.clientId,
      username,
      password
    });

    if (this.config.auth.clientSecret) body.set('client_secret', this.config.auth.clientSecret);

    const response = await fetch(this.getTokenUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Pega login failed with ${response.status}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + Math.max((data.expires_in || 300) - 30, 30) * 1000;

    return {
      accessToken: this.token,
      expiresAt: this.tokenExpiresAt,
      tokenType: data.token_type
    };
  }

  async request<T>(path: string, init: RequestInit = {}, baseOverride?: string): Promise<T> {
    const token = await this.authenticate();
    const base = baseOverride || this.getApplicationApiBase();
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Pega API ${path} failed with ${response.status}: ${text.slice(0, 240)}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  getCaseTypes() {
    return this.request<{ caseTypes?: PegaCaseType[]; data?: PegaCaseType[] }>('/casetypes');
  }

  createCase(
    caseTypeId: string,
    content: Record<string, unknown> = {},
    options: { viewType?: PegaViewType; pageName?: string; processID?: string } = {}
  ) {
    const { processID, ...queryOptions } = {
      ...options,
      ...(options.viewType === 'page' && !options.pageName ? { pageName: 'pyDetails' } : {})
    };

    return this.request<PegaCaseResponse>(this.withQuery('/cases', queryOptions), {
      method: 'POST',
      body: JSON.stringify({
        caseTypeID: caseTypeId,
        content,
        ...(processID ? { processID } : {})
      })
    });
  }

  getCase(caseId: string) {
    return this.request<PegaCase>(`/cases/${encodeURIComponent(caseId)}`);
  }

  getAssignment(assignmentId: string, options: { viewType?: Exclude<PegaViewType, 'none'>; pageName?: string } = {}) {
    return this.request<PegaAssignmentResponse>(
      this.withQuery(`/assignments/${encodeURIComponent(assignmentId)}`, options)
    );
  }

  getAssignmentAction(
    assignmentId: string,
    actionId: string,
    options: { viewType?: Exclude<PegaViewType, 'none'>; excludeAdditionalActions?: boolean } = {}
  ) {
    return this.request<PegaAssignmentResponse>(
      this.withQuery(`/assignments/${encodeURIComponent(assignmentId)}/actions/${encodeURIComponent(actionId)}`, options)
    );
  }

  performAssignmentAction(assignmentId: string, actionId: string, content: Record<string, unknown>) {
    return this.request(`/assignments/${encodeURIComponent(assignmentId)}/actions/${encodeURIComponent(actionId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
  }

  performCaseAction(caseId: string, actionId: string, content: Record<string, unknown>) {
    return this.request(`/cases/${encodeURIComponent(caseId)}/actions/${encodeURIComponent(actionId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
  }

  getDataView<T>(dataViewId: string, request: DataViewRequest = {}) {
    return this.request<T>(`/data_views/${encodeURIComponent(dataViewId)}`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async uploadAttachment(file: File) {
    const token = await this.authenticate();
    const base = this.getApplicationApiBase();
    const body = new FormData();
    body.append('file', file, file.name);

    const response = await fetch(`${base}/attachments/upload`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      },
      body
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Pega attachment upload failed with ${response.status}: ${text.slice(0, 240)}`);
    }

    const data = (await response.json()) as { ID?: string; id?: string; data?: { ID?: string; id?: string } };
    const id = data.ID || data.id || data.data?.ID || data.data?.id;

    if (!id) {
      throw new Error('Pega attachment upload did not return an attachment ID.');
    }

    return {
      ID: id,
      name: file.name,
      type: 'File' as const
    };
  }

  // === AI Agent (A2A / AgentX) support ===
  // Using the standard DX application/v2 surface for /ai-agents.
  // The DX schema does not define arbitrary context on message calls, so caller
  // supplied values should be included in Request text unless Pega exposes a
  // typed parameter surface for the agent.

  async initiateAgentConversation(
    agentId: string,
    options: {
      activeChannel?: string;
      activeChannelID?: string;
      executeStarterQuestion?: boolean;
      interactionID?: string;
    } = {}
  ) {
    const path = `/ai-agents/${encodeURIComponent(agentId)}/conversations`;
    return this.request<{ conversationID?: string; ID?: string; conversationId?: string }>(
      path,
      {
        method: 'POST',
        body: JSON.stringify({
          executeStarterQuestion: false,
          interactionID: `portal-${Date.now()}`,
          ...options
        })
      }
    );
  }

  async sendMessageToAgentConversation(
    agentId: string,
    conversationId: string,
    content: string,
    attachments: PegaAgentAttachment[] = []
  ) {
    const path = `/ai-agents/${encodeURIComponent(agentId)}/conversations/${encodeURIComponent(conversationId)}`;
    return this.request(
      path,
      {
        method: 'PATCH',
        body: JSON.stringify({
          Request: content,
          ...(attachments.length > 0 ? { Attachments: attachments } : {})
        })
      }
    );
  }

  async getAgentConversation(agentId: string, conversationId: string) {
    const path = `/ai-agents/${encodeURIComponent(agentId)}/conversations/${encodeURIComponent(conversationId)}`;
    return this.request(path);
  }

  /**
   * Send a message using the streaming (SSE) response that this agent supports.
   * Matches the payload and event stream format seen in direct Pega testing.
   */
  async sendMessageToAgentConversationWithStream(
    agentId: string,
    conversationId: string,
    requestText: string,
    attachments: PegaAgentAttachment[] = []
  ): Promise<{ response: string }> {
    const path = `/ai-agents/${encodeURIComponent(agentId)}/conversations/${encodeURIComponent(conversationId)}`;
    const token = await this.authenticate();
    const base = this.getApplicationApiBase();

    const res = await fetch(`${base}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        Request: requestText,
        ...(attachments.length > 0 ? { Attachments: attachments } : {}),
        capabilities: {
          stream: { isEnabled: true }
        }
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Agent stream request failed with ${res.status}: ${text.slice(0, 300)}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let finalResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.substring(5).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (typeof data.content === 'string') {
              accumulated += data.content;
            }
            if (data.response && typeof data.response === 'string') {
              finalResponse = data.response;
            }
          } catch {
            // The very last payload is sometimes a raw JSON (not under event:)
            if (dataStr.includes('"response"')) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.response) finalResponse = parsed.response;
              } catch {}
            }
          }
        }
      }
    }

    const responseText = finalResponse || accumulated;
    return { response: responseText };
  }
}
