# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report vulnerabilities privately through GitHub Security Advisories:
**[Report a vulnerability](https://github.com/rammadhavan2304/pega-constellation-starter/security/advisories/new)**
(repository → *Security* tab → *Report a vulnerability*).

Please include:

- a description of the issue and its impact,
- steps to reproduce (a minimal proof of concept if possible),
- affected files / versions.

You can expect an acknowledgement within 5 working days. Fixes are released as
soon as practical and credited in the advisory unless you prefer to remain anonymous.

## Supported versions

Only the latest commit on `main` is supported.

## Handling credentials

This project talks to Pega Infinity / Pega Cloud using OAuth 2.0. Keep your
credentials safe:

- Never commit `.env`, `sdk-config.json`, certificates or keystores — they are
  git-ignored on purpose. Use `.env.example` and `sdk-config.example.json` as templates.
- Every `VITE_*` variable is compiled into the browser bundle. Only use OAuth
  clients that are designed to be public (e.g. Authorization Code + PKCE) for
  anything beyond local development, and never ship a confidential client secret
  to end users.
- If you accidentally publish a secret, **revoke/rotate it in Pega immediately**
  (Dev Studio → Records → Security → OAuth 2.0 Client Registration), then remove it
  from history.
