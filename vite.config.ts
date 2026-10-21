import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The Pega SDK (@pega/auth) fetches `./sdk-config.json` at runtime.
 * Real credentials must never be committed, so this plugin serves that file
 * from one of two places:
 *   1. a local, git-ignored `sdk-config.json` (copy sdk-config.example.json), or
 *   2. values generated from your `.env` (VITE_PEGA_* variables).
 * It only runs in the dev server, so credentials are never written into `dist/`.
 */
function sdkConfigPlugin(env: Record<string, string>): Plugin {
  const localFile = resolve(process.cwd(), 'sdk-config.json');

  const build = () => {
    if (existsSync(localFile)) return readFileSync(localFile, 'utf-8');

    // e.g. https://host/prweb (a trailing /PRAuth is tolerated)
    const baseUrl = (env.VITE_PEGA_BASE_URL || '').replace(/\/+$/, '').replace(/\/PRAuth$/i, '');
    const clientId = env.VITE_PEGA_SDK_CLIENT_ID || env.VITE_PEGA_CLIENT_ID || '';
    const clientSecret = env.VITE_PEGA_SDK_CLIENT_SECRET || env.VITE_PEGA_CLIENT_SECRET || '';

    return JSON.stringify(
      {
        authConfig: {
          authService: 'pega',
          mashupClientId: clientId,
          mashupClientSecret: clientSecret,
          mashupGrantType: 'clientCreds',
          mashupUserIdentifier: '',
          mashupPassword: '',
          portalGrantType: 'clientCreds',
          portalClientId: clientId,
          portalClientSecret: clientSecret
        },
        serverConfig: {
          apiServer: baseUrl ? `${baseUrl}/PRAuth` : '',
          infinityRestServerUrl: baseUrl,
          appAlias: env.VITE_PEGA_APP_ALIAS || '',
          sdkContentServerUrl: '',
          appPortal: '',
          appMashupCaseType: '',
          excludePortals: ['pxExpress', 'Developer', 'pxPredictionStudio', 'pxAdminStudio', 'pyCaseWorker', 'pyCaseManager7']
        }
      },
      null,
      2
    );
  };

  return {
    name: 'pega-sdk-config',
    configureServer(server) {
      server.middlewares.use('/sdk-config.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(build());
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const pegaBaseUrl = env.VITE_PEGA_BASE_URL;
  const pegaTarget = pegaBaseUrl ? new URL(pegaBaseUrl) : null;
  const pegaProxyPath = pegaTarget?.pathname.split('/').filter(Boolean)[0];

  return {
    plugins: [react(), sdkConfigPlugin(env)],
    server: {
      port: 3502,
      proxy: pegaTarget && pegaProxyPath
        ? {
            [`/${pegaProxyPath}`]: {
              target: pegaTarget.origin,
              changeOrigin: true,
              secure: false
            }
          }
        : undefined
    }
  };
});
