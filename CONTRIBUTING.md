# Contributing

Thanks for your interest in improving **Pega Constellation Starter**! Issues,
discussions and pull requests are all welcome.

## Ground rules

- Be kind — this project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Never include real credentials, instance URLs or customer data** in issues,
  commits, screenshots or test fixtures. Use `your-pega-host.example.com` and
  obviously-fake sample data.
- Do not contribute client-specific branding or proprietary assets.
- Pega's ConstellationJS engine is licensed separately by Pegasystems and is
  copied from `node_modules` at install time — please don't commit it.

## Development setup

```bash
git clone https://github.com/rammadhavan2304/pega-constellation-starter.git
cd pega-constellation-starter
cp .env.example .env        # fill in your own Pega instance values
npm install                 # also copies the ConstellationJS engine into public/constellation
npm run dev                 # http://localhost:3502
```

Before opening a PR:

```bash
npm run build               # type-checks (tsc) and builds with Vite
```

## Pull requests

1. Fork the repo and create a topic branch from `main`.
2. Keep changes focused; one feature or fix per PR.
3. Describe *what* and *why*, and how you tested it (Pega version, DX API v2, etc.).
4. Update `README.md` / `docs/` when behaviour or configuration changes.
5. Make sure CI is green.

## Good first contributions

- Additional sample data-view / case-type mappings in `docs/`.
- Unit tests for `src/services/portalDataService.ts` mapping helpers.
- Accessibility and responsive-layout fixes.
- Copilot Studio agent topics and connector improvements under `.agents/`.

## Reporting bugs and requesting features

Open an issue using the templates provided. For security issues see [SECURITY.md](SECURITY.md).
