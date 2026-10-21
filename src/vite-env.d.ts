/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PEGA_BASE_URL?: string;
  readonly VITE_PEGA_DEV_PROXY?: string;
  readonly VITE_PEGA_APP_ALIAS?: string;
  readonly VITE_PEGA_CUSTOMER_ID_PARAM?: string;
  readonly VITE_PEGA_CLIENT_ID?: string;
  readonly VITE_PEGA_CLIENT_SECRET?: string;
  readonly VITE_PEGA_GRANT_TYPE?: string;
  readonly VITE_PEGA_AUTHORIZATION_URL?: string;
  readonly VITE_PEGA_TOKEN_URL?: string;
  readonly VITE_PEGA_REVOKE_URL?: string;
  readonly VITE_PEGA_JWKS_URL?: string;
  readonly VITE_PEGA_INTROSPECT_URL?: string;
  readonly VITE_PEGA_API_CLIENT_ID?: string;
  readonly VITE_PEGA_API_CLIENT_SECRET?: string;
  readonly VITE_PEGA_API_GRANT_TYPE?: string;
  readonly VITE_PEGA_API_AUTHORIZATION_URL?: string;
  readonly VITE_PEGA_API_TOKEN_URL?: string;
  readonly VITE_PEGA_API_REVOKE_URL?: string;
  readonly VITE_PEGA_API_JWKS_URL?: string;
  readonly VITE_PEGA_API_INTROSPECT_URL?: string;
  readonly VITE_PEGA_USERNAME?: string;
  readonly VITE_PEGA_PASSWORD?: string;
  readonly VITE_PEGA_POLICY_DATA_VIEW_ID?: string;
  readonly VITE_PEGA_CLAIMS_DATA_VIEW_ID?: string;
  readonly VITE_PEGA_SERVICE_TASKS_DATA_VIEW_ID?: string;
  readonly VITE_PEGA_DASHBOARD_DATA_VIEW_ID?: string;
  readonly VITE_PEGA_CLAIM_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_HEALTH_CLAIM_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_MOTOR_CLAIM_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_COMPLAINT_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_MANUAL_TRIAGE_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_SERVICE_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_CHANGE_ADDRESS_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_CHANGE_CONTACT_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_POLICY_CHANGE_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_SCHEDULE_CONSULTATION_CASE_TYPE_ID?: string;
  readonly VITE_PEGA_POLICY_AGENT_ID?: string;
  readonly VITE_PEGA_SDK_CLIENT_ID?: string;
  readonly VITE_PEGA_SDK_CLIENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
