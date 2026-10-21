# Pega Constellation Starter

[![CI](https://github.com/rammadhavan2304/pega-constellation-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/rammadhavan2304/pega-constellation-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An open-source starter for building **custom front-ends on Pega Infinity / Pega Cloud
with the Constellation SDK**: a React + TypeScript + Vite customer portal that also
ships as an Android app via Capacitor, plus **Microsoft Copilot Studio** agents and a
Power Platform custom connector that call **Pega AI agents** through the DX API.

The sample domain is a (fictional) insurance self-service portal — policies, claims,
service requests and a policy-document AI chat — but the patterns are generic to any
Pega Constellation application.

> Not affiliated with or endorsed by Pegasystems or Microsoft. "Pega", "Constellation"
> and "Copilot Studio" are trademarks of their respective owners.

---

## Features

**Portal (React 18 + TypeScript + Vite + MUI)**

- **Pega OAuth 2.0 login** – operators sign in with their Pega credentials
  (`src/services/pegaDxClient.ts`, `src/services/authService.ts`).
- **Constellation SDK rendering** – starts the Constellation runtime in *hybrid/mashup*
  mode and renders Pega-authored case views and assignments inside the portal
  (`src/lib/constellation.tsx`, `src/hooks/useConstellation.ts`,
  `@pega/react-sdk-components`).
- **DX API v2 client** – case creation, case types, assignments and actions, data views
  and attachments (`src/services/pegaDxClient.ts`).
- **Dashboard / Policies / Claims / Services pages** fed from configurable Pega data
  views, with a mock-data fallback when no Pega instance is configured
  (`src/services/portalDataService.ts`, `src/services/mockPortalService.ts`).
- **Pending customer tasks** loaded through PCore and opened as Constellation assignments.
- **Policy AI chat** – conversational Q&A over a policy document using Pega's
  `/ai-agents/{agentId}/conversations` endpoints, with SSE streaming and file attachments
  (`src/components/PolicyAIChat.tsx`).
- **Pega Web Embed** – example modal that hosts a `<pega-embed>` component
  (`src/components/WebEmbedModal.tsx`).
- **Brand/theme layer** – one place for copy, palette and CSS variables
  (`src/branding/brandConfig.ts`).
- **Custom DX component template** for the Pega DX Component Builder
  (`src/components/custom-sdk`, `src/components/custom-constellation`).

**Mobile (Capacitor 8)**

- `android/` project that wraps the same web build (`npm run android:sync`).

**Microsoft Copilot Studio + Power Platform (`.agents/`)**

| Folder | What it is |
| --- | --- |
| `pega-policy-assistant/` | Copilot Studio agent (generative orchestration) that answers policy questions by calling the Pega PolicyQuestion agent. |
| `pega-policy-connector/` | Power Platform custom connector (Swagger + C# `script.csx`) that starts a Pega DX agent conversation, sends the question and polls for the answer. OAuth 2.0 (generic) against Pega. |
| `pega-policy-oauth-template/` | Minimal OAuth 2.0 custom-connector template with placeholders. |
| `inspect-claims-agent/` | Scaffold of a second Copilot Studio agent (default topics only) to extend for claims. |

Additional API contracts live in `docs/` (OpenAPI/Swagger for the Pega PolicyQuestion
agent and the connector code), and `examples/` contains a stand-alone JavaScript chat
widget that can be dropped into a Pega section, plus a sample Pega agent definition.

---

## Architecture

```text
 ┌────────────────────────────── Browser / Android (Capacitor) ─────────────────────────────┐
 │  React + MUI portal (src/)                                                               │
 │   ├─ authService ──► Pega OAuth 2.0 token endpoint                                       │
 │   ├─ pegaDxClient ──► DX API v2: /cases, /assignments, /data_views, /attachments,        │
 │   │                   /ai-agents/{id}/conversations (SSE)                                │
 │   └─ Constellation SDK (@pega/react-sdk-components + ConstellationJS engine)             │
 │        └─ renders Pega-authored views/assignments inside <PegaRootContainer/>            │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
                                        │ HTTPS (OAuth bearer)
                                        ▼
                       Pega Infinity / Pega Cloud  (your application)
                                        ▲
                                        │ HTTPS (OAuth 2.0, custom connector)
 ┌───────────── Microsoft Copilot Studio ─────────────┐
 │  Pega Policy Assistant agent ──► Pega connector    │
 │  (script.csx: start conversation → send → poll)     │
 └─────────────────────────────────────────────────────┘
```

The ConstellationJS engine (`@pega/constellationjs`) is distributed by Pegasystems under
its own license. It is **not** committed here; `npm install` copies it from
`node_modules` into `public/constellation/` (see `scripts/copy-constellation.mjs`).

---

## Getting started

### Prerequisites

- Node.js 20+
- A Pega Infinity '24/'25 or Pega Cloud instance with a Constellation application
  (DX API v2 enabled)
- (Optional) Android Studio for the mobile build
- (Optional) Microsoft Copilot Studio / Power Platform environment for the agents

### 1. Register an OAuth 2.0 client in Pega

In **Dev Studio → Records → Security → OAuth 2.0 Client Registration** create a client
for the portal (e.g. *Authorization Code + PKCE* for production; *password* or
*client credentials* only for local development). Note the **client ID** (and secret
if confidential) and the token/authorize endpoints. Make sure the operator's access
group has the DX API / application privileges your case types need.

For the Copilot Studio connector, register a second client using the
Authorization Code grant with redirect URL `https://global.consent.azure-apim.net/redirect`.

### 2. Configure

```bash
cp .env.example .env
# edit .env: VITE_PEGA_BASE_URL, VITE_PEGA_APP_ALIAS, VITE_PEGA_CLIENT_ID, ...
```

| Variable | Purpose |
| --- | --- |
| `VITE_PEGA_BASE_URL` | Instance URL incl. context root, e.g. `https://your-pega-host.example.com/prweb` |
| `VITE_PEGA_APP_ALIAS` | Application alias used in `/app/{alias}/api/application/v2` |
| `VITE_PEGA_CLIENT_ID` / `VITE_PEGA_CLIENT_SECRET` | OAuth client used for login |
| `VITE_PEGA_TOKEN_URL` (+ authorize/revoke/jwks/introspect) | Override OAuth endpoints if needed |
| `VITE_PEGA_API_CLIENT_ID` / `..._SECRET` | Optional separate client for DX API calls |
| `VITE_PEGA_SDK_CLIENT_ID` / `..._SECRET` | Optional client for the Constellation SDK (defaults to the login client) |
| `VITE_PEGA_DEV_PROXY` | `true` to proxy Pega calls through the Vite dev server (avoids CORS locally) |
| `VITE_PEGA_*_DATA_VIEW_ID` | Data views that feed dashboard, policies and claims |
| `VITE_PEGA_*_CASE_TYPE_ID` | Case types started from the Claims / Services pages |
| `VITE_PEGA_POLICY_AGENT_ID` | Pega AI agent used by the policy chat |

The Constellation SDK reads `sdk-config.json` at runtime. In development it is
generated from your `.env` automatically; alternatively copy `sdk-config.example.json`
to `sdk-config.json` (git-ignored) — that file is also what the Pega DX Component
Builder CLI (`npm run authenticate|create|publish`) uses.

> ⚠️ `VITE_*` values are compiled into the client bundle. Do not put production
> confidential-client secrets in them. See [SECURITY.md](SECURITY.md).

Without any Pega configuration the portal still runs on mock data, which is handy for
UI work.

### 3. Run

```bash
npm install          # installs deps and copies the ConstellationJS engine
npm run dev          # http://localhost:3502
npm run build        # tsc type-check + production build into dist/
```

### 4. Android (optional)

```bash
npm run android:sync # build web assets and sync into android/
npm run android:open # open in Android Studio
```

### 5. Copilot Studio agent + connector (optional)

1. In Power Platform, create a custom connector from
   `.agents/pega-policy-connector/apiDefinition.yaml`, paste `script.csx` into the
   *Code* tab and set the OAuth values from `apiProperties.json`
   (replace `your-pega-host.example.com` and `REPLACE_ME_CLIENT_ID`).
2. Import / recreate the `pega-policy-assistant` agent (YAML exported from Copilot
   Studio) and add the connector action **Invoke PolicyQuestion Agent** as a tool.
3. Test with a question, customer ID, policy ID and policy document URL.

---

## Project structure

```text
.agents/            Copilot Studio agents + Power Platform custom connector
android/            Capacitor Android project
docs/               DX mapping notes, OpenAPI/Swagger contracts, connector code
examples/           Stand-alone Pega-section chat widget, sample Pega agent definition
scripts/            Build helpers (copies ConstellationJS engine)
src/
  branding/         Theme/copy configuration
  components/       App shell, Pega root container, AI chat, Web Embed, DX component templates
  config/           Environment → runtime config
  hooks/            Constellation bootstrap hook
  lib/              Constellation mashup helpers (create case, open assignment)
  pages/            Dashboard, Policies, Claims, Services, Login
  services/         DX API client, auth, data mapping, mock data
```

---

## Roadmap

- [ ] **AI-assisted Pega modernisation** – agents/tools that analyse legacy Pega UI
      (UI-Kit / Theme Cosmos) and low-code apps and generate Constellation-ready views,
      data-view mappings and portal code.
- [ ] Authorization Code + PKCE login flow by default (no client secret in the browser).
- [ ] Unit tests for DX response mapping and Playwright end-to-end smoke tests.
- [ ] Config-driven pages (data views and case types declared in JSON).
- [ ] iOS Capacitor target.
- [ ] Packaged Copilot Studio solution export for one-click import.
- [ ] More Pega AI agent integrations (claims triage, document Q&A).

Ideas and PRs are welcome — see below.

## Contributing

Contributions are very welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Ramprasad Madhavan.
Third-party packages (including Pega's ConstellationJS engine and SDK packages) are
licensed by their respective owners.
