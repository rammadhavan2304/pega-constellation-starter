import type { PegaRuntimeConfig } from '../types/pega';

const valueOrUndefined = (value: string | undefined) => {
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

export const getPegaConfig = (): PegaRuntimeConfig | null => {
  const baseUrl = valueOrUndefined(import.meta.env.VITE_PEGA_BASE_URL);
  const clientId = valueOrUndefined(import.meta.env.VITE_PEGA_CLIENT_ID);

  if (!baseUrl || !clientId) {
    return null;
  }

  const apiClientId = valueOrUndefined(import.meta.env.VITE_PEGA_API_CLIENT_ID);

  return {
    baseUrl,
    appAlias: valueOrUndefined(import.meta.env.VITE_PEGA_APP_ALIAS),
    customerIdParam: valueOrUndefined(import.meta.env.VITE_PEGA_CUSTOMER_ID_PARAM) || 'CustomerID',
    auth: {
      clientId,
      clientSecret: valueOrUndefined(import.meta.env.VITE_PEGA_CLIENT_SECRET),
      grantType:
        (valueOrUndefined(import.meta.env.VITE_PEGA_GRANT_TYPE) as PegaRuntimeConfig['auth']['grantType']) ||
        'client_credentials',
      authorizationUrl: valueOrUndefined(import.meta.env.VITE_PEGA_AUTHORIZATION_URL),
      tokenUrl: valueOrUndefined(import.meta.env.VITE_PEGA_TOKEN_URL),
      revokeUrl: valueOrUndefined(import.meta.env.VITE_PEGA_REVOKE_URL),
      jwksUrl: valueOrUndefined(import.meta.env.VITE_PEGA_JWKS_URL),
      introspectUrl: valueOrUndefined(import.meta.env.VITE_PEGA_INTROSPECT_URL),
      username: valueOrUndefined(import.meta.env.VITE_PEGA_USERNAME),
      password: valueOrUndefined(import.meta.env.VITE_PEGA_PASSWORD)
    },
    apiAuth: apiClientId
      ? {
          clientId: apiClientId,
          clientSecret: valueOrUndefined(import.meta.env.VITE_PEGA_API_CLIENT_SECRET),
          grantType:
            (valueOrUndefined(import.meta.env.VITE_PEGA_API_GRANT_TYPE) as PegaRuntimeConfig['auth']['grantType']) ||
            'client_credentials',
          authorizationUrl:
            valueOrUndefined(import.meta.env.VITE_PEGA_API_AUTHORIZATION_URL) ||
            valueOrUndefined(import.meta.env.VITE_PEGA_AUTHORIZATION_URL),
          tokenUrl: valueOrUndefined(import.meta.env.VITE_PEGA_API_TOKEN_URL) || valueOrUndefined(import.meta.env.VITE_PEGA_TOKEN_URL),
          revokeUrl: valueOrUndefined(import.meta.env.VITE_PEGA_API_REVOKE_URL) || valueOrUndefined(import.meta.env.VITE_PEGA_REVOKE_URL),
          jwksUrl: valueOrUndefined(import.meta.env.VITE_PEGA_API_JWKS_URL) || valueOrUndefined(import.meta.env.VITE_PEGA_JWKS_URL),
          introspectUrl:
            valueOrUndefined(import.meta.env.VITE_PEGA_API_INTROSPECT_URL) ||
            valueOrUndefined(import.meta.env.VITE_PEGA_INTROSPECT_URL)
        }
      : undefined,
    dataViews: {
      policies: valueOrUndefined(import.meta.env.VITE_PEGA_POLICY_DATA_VIEW_ID),
      claims: valueOrUndefined(import.meta.env.VITE_PEGA_CLAIMS_DATA_VIEW_ID),
      serviceTasks: valueOrUndefined(import.meta.env.VITE_PEGA_SERVICE_TASKS_DATA_VIEW_ID),
      dashboard: valueOrUndefined(import.meta.env.VITE_PEGA_DASHBOARD_DATA_VIEW_ID)
    },
    caseTypes: {
      claim: valueOrUndefined(import.meta.env.VITE_PEGA_CLAIM_CASE_TYPE_ID),
      healthClaim: valueOrUndefined(import.meta.env.VITE_PEGA_HEALTH_CLAIM_CASE_TYPE_ID),
      motorClaim: valueOrUndefined(import.meta.env.VITE_PEGA_MOTOR_CLAIM_CASE_TYPE_ID),
      complaint: valueOrUndefined(import.meta.env.VITE_PEGA_COMPLAINT_CASE_TYPE_ID),
      manualTriage: valueOrUndefined(import.meta.env.VITE_PEGA_MANUAL_TRIAGE_CASE_TYPE_ID),
      service: valueOrUndefined(import.meta.env.VITE_PEGA_SERVICE_CASE_TYPE_ID),
      changeAddress: valueOrUndefined(import.meta.env.VITE_PEGA_CHANGE_ADDRESS_CASE_TYPE_ID),
      changeContact: valueOrUndefined(import.meta.env.VITE_PEGA_CHANGE_CONTACT_CASE_TYPE_ID),
      policyChange: valueOrUndefined(import.meta.env.VITE_PEGA_POLICY_CHANGE_CASE_TYPE_ID),
      scheduleConsultation: valueOrUndefined(import.meta.env.VITE_PEGA_SCHEDULE_CONSULTATION_CASE_TYPE_ID)
    }
  };
};

export const isPegaConfigured = () => getPegaConfig() !== null;
