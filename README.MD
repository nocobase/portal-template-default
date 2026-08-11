# NocoBase Portal Template

A React and shadcn/ui template for building standalone frontends backed by
NocoBase.

![NocoBase Portal Template](https://static-docs.nocobase.com/2026-07-22-08-48-12.png)

## Quick start

```bash
pnpm install
cp .env.client.example .env.client.dev
cp .env.server.example .env.server.dev
pnpm dev
```

The development server starts at `http://localhost:5173` by default.
`pnpm dev` also starts the Portal dev server at `http://localhost:3000`.

## Configuration

The Portal uses separate client-visible and server-only env files:

```txt
.env.client.dev
.env.server.dev
.env.client.prod
.env.server.prod
```

Client env has no required configuration. Only API client storage settings are
configurable there:

```env
# API_CLIENT_STORAGE_PREFIX=NOCOBASE_
# API_CLIENT_STORAGE_TYPE=localStorage
# API_CLIENT_SHARE_TOKEN=false
```

The minimum server configuration is:

```env
NOCOBASE_API_PROXY_TARGET=https://example.com/api
NOCOBASE_PORTAL_NAME=main
```

- `.env.client.*` contributes only API client storage settings. Portal
  identity, browser API URL, Portal base, WebSocket URL, and authenticator are
  generated into `window.__NOCOBASE_PORTAL_ENV__` during dev/build.
- `.env.server.*` is read only by the Portal server and is not registered onto
  `process.env`.
- `NOCOBASE_APP_NAME` is derived from `NOCOBASE_API_PROXY_TARGET`, where `/api`
  means `main`, and `/api/__app/<appName>` means `<appName>`. The derived value
  is added to `window.__NOCOBASE_PORTAL_ENV__` automatically.
- `NOCOBASE_PORTAL_NAME` is the Portal runtime name.
- `NOCOBASE_API_URL` is derived as `/portals/<NOCOBASE_PORTAL_NAME>/api` for
  the `main` app, or
  `/apps/<NOCOBASE_APP_NAME>/portals/<NOCOBASE_PORTAL_NAME>/api` for other
  apps. When `NOCOBASE_API_PROXY_TARGET` includes a NocoBase public path before
  `/api`, such as `/nocobase/api`, that public path is prepended during dev and
  build.
- `NOCOBASE_API_PROXY_TARGET` is the real NocoBase REST API target used by the
  Portal server. Keep service-only URLs and secrets out of browser-exposed
  variables.
- Portal-owned APIs use the derived API prefix plus `/_portal/...`, for example
  `/portals/main/api/_portal/users/metadata`.
- `NOCOBASE_PORTAL_BASE` is derived as `/x/<NOCOBASE_PORTAL_NAME>` for the
  `main` app, or `/x/apps/<NOCOBASE_APP_NAME>/<NOCOBASE_PORTAL_NAME>` for other
  apps. The same NocoBase public path is prepended in `pnpm dev`, so
  `NOCOBASE_API_PROXY_TARGET=http://localhost:64074/nocobase/api` and
  `NOCOBASE_PORTAL_NAME=test3` serve the dev frontend at `/nocobase/x/test3/`,
  API requests under `/nocobase/portals/test3/api`, and WebSocket requests under
  `/nocobase/portals/test3/ws`.
- `pnpm build:html` prefixes generated frontend asset URLs and the injected
  `NOCOBASE_API_URL`, `NOCOBASE_PORTAL_BASE`, and `NOCOBASE_WS_URL` with the
  NocoBase public path inferred from `NOCOBASE_API_PROXY_TARGET`. For example,
  a target ending in `/nocobase/api` emits frontend URLs under
  `/nocobase/x/<NOCOBASE_PORTAL_NAME>/` and Portal API requests under
  `/nocobase/portals/<NOCOBASE_PORTAL_NAME>/api`.
- `NOCOBASE_WS_PROXY_TARGET` and `PORTAL_BASE_PATH` are derived automatically
  from `NOCOBASE_API_PROXY_TARGET`, `NOCOBASE_PORTAL_NAME`, and the generated
  browser API URL.

The Portal uses the same authentication storage convention as NocoBase. If the
server customizes it, keep `API_CLIENT_STORAGE_PREFIX`,
`API_CLIENT_STORAGE_TYPE`, and `API_CLIENT_SHARE_TOKEN` aligned with the server.

## Development

```bash
# Start the Vite development server and Portal dev server
pnpm dev

# Build the production client assets
pnpm build:client

# Build the production assets, runtime HTML, and server output
pnpm build

# Start the compiled Portal server
pnpm start

# Serve only a production client build with Refine
pnpm start:client

# Build a standalone HTML artifact
pnpm build:html
```

`pnpm build:client` emits browser assets to `dist/client`. `pnpm build:html`
injects the generated `window.__NOCOBASE_PORTAL_ENV__` runtime config into
`dist/client/index.html`, using only the three client env storage settings plus
values derived from server env and defaults. `pnpm build:server` emits the ESM
server build, production package manifest, `.env.server.prod`, and server
runtime dependencies to the `dist` package root.

Server logs are written as JSON lines under `logs/<standalone|embedded>/` with
dated `system-YYYY-MM-DD.log` and `request-YYYY-MM-DD.log` files. Set
`PORTAL_LOG_LEVEL` to adjust the Pino log level.

Application pages and resources live under `client`. The included Users page is a
working example based on the standard NocoBase `users` collection.

Application translations live in `client/locales`. Default locale, available
locale labels, i18next options, and post-switch behavior remain customizable in
`client/providers/i18n/runtime.ts`. Shared UI components live in
`client/components/ui` and follow the shadcn Base UI conventions.

Stable NocoBase runtime behavior is provided by `@nocobase/portal-sdk`.
The template records its inherited base version in
`nocobase.defaultTemplateVersion`; SDK installation, development, and builds
stop with an actionable error when that version is outside the SDK's supported
range. Application composition and visual source remain owned by this project.

## Extensions

Installed extensions live in `client/extensions` and are ordinary
application-owned source files. Their providers, resources, routes, login
adapters, and user-menu items are discovered automatically.

Routes declared with `defineAppRoutes` can use `lazy: () => import(...)` to
keep page modules out of the initial bundle while preserving synchronous menu,
resource, and access metadata.

Set `registryRoutesEnabled` to `false` in `client/routes.tsx` when replacing the
bundled example navigation with application-owned routes. Installed extension
providers, login adapters, and the `/dev` component showcases remain available.

Optional NocoBase integrations, including authentication methods and i18n, can
be installed from the `@nocobase` Registry configured in `components.json`.
After installation, the generated source can be customized and committed with
the application.

Registry implementations import runtime APIs from documented
`@nocobase/portal-sdk` subpaths and continue to use `@/components` for
application-owned visual composition. Each Registry item declares the minimum
compatible SDK version in `registry.config.json`.

In this Registry source repository, canonical extension source lives in
`registry` and is loaded directly by `pnpm dev` and `pnpm build`. The published
npm template contains the default extensions under `client/extensions` instead.

## Authentication

Basic username or email and password login is built in. The default login page
also renders enabled NocoBase authentication methods when their frontend
Registry adapters are installed.

Customize `client/pages/login/index.tsx` to replace the whole login page, or use
`DefaultSignInPage` to keep dynamic authentication while overriding individual
authenticator UI.

## Testing

Frontend logic and component tests live under `tests/` and run with Vitest and
Testing Library. Registry-owned tests live beside each item under
`registry/<name>/tests`, while Portal SDK tests live under `sdk/tests` and run
through the SDK package. These tests exercise local behavior without mocking
NocoBase APIs, authentication, ACL, or data providers. Put behavior that needs
real server data under `e2e/` instead.

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm test:sdk
```

Playwright E2E tests connect to a real NocoBase environment. The included smoke
test signs in through the actual Portal login page, verifies the server session,
and confirms that authentication survives a reload. It does not depend on any
Registry example page.

Copy `.env.e2e.example` to `.env.e2e` and provide a dedicated test account.
Playwright always starts an isolated Portal dev server at
`http://127.0.0.1:4173` (configurable with `NOCOBASE_E2E_PORT`) and stops it when
the run finishes. Set `NOCOBASE_E2E_API_URL` to the real NocoBase backend and
`NOCOBASE_PORTAL_BASE` to the Portal path under test. The default command never
reuses a manually started frontend.

```bash
pnpm test:e2e:install
pnpm test:e2e
pnpm test:e2e:ui
```

Reusable E2E helpers currently live in `e2e/support`. They provide environment
and basename resolution, NocoBase resource/action requests, API sign-in and
session checks, and browser session installation. Keep business-specific test
data and assertions in the application. These helpers can move into the Portal
SDK after their application-facing contract has stabilized.

The root `pnpm test` command includes both template and Registry tests. The
published template contains materialized extensions instead of `registry/`,
but their tests remain source-repository checks and are not copied into user
projects.
Default Template source upgrades are documented in the
[template migration guide](https://github.com/nocobase/portal-template-default/blob/main/MIGRATION.md).
SDK API and compatibility changes are documented separately in the
[Portal SDK migration guide](https://github.com/nocobase/portal-template-default/blob/main/sdk/MIGRATION.md).

## Learn more

- [NocoBase documentation](https://docs.nocobase.com/)
- [Refine documentation](https://refine.dev/docs/)
- [shadcn/ui documentation](https://ui.shadcn.com/)

## License

MIT
