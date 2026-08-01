# NocoBase Portal Template

A React and shadcn/ui template for building standalone frontends backed by
NocoBase.

![NocoBase Portal Template](https://static-docs.nocobase.com/2026-07-22-08-48-12.png)

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The development server starts at `http://localhost:5173` by default.

## Configuration

The minimum local configuration is:

```env
NOCOBASE_API_URL=/api
NOCOBASE_PORTAL_BASE=/
```

- `NOCOBASE_API_URL` is the NocoBase REST API root and must include `/api`.
  Same-origin deployments normally use `/api`. During local development, an
  absolute URL is handled through the Vite proxy.
- `NOCOBASE_PORTAL_BASE` is the public path where the Portal is mounted. Use
  `/` for root development or set the deployment path before building.
- `NOCOBASE_API_TOKEN` can provide a temporary development token. Never commit
  real tokens.

The Portal uses the same authentication storage convention as NocoBase. If the
server customizes it, keep `API_CLIENT_STORAGE_PREFIX`,
`API_CLIENT_STORAGE_TYPE`, and `API_CLIENT_SHARE_TOKEN` aligned with the server.

## Development

```bash
# Start the Vite development server
pnpm dev

# Build the production assets
pnpm build

# Serve a production build
pnpm start

# Build a standalone HTML artifact
pnpm build:html
```

Application pages and resources live under `src`. The included Users page is a
working example based on the standard NocoBase `users` collection.

Application translations live in `src/locales`. Default locale, available
locale labels, i18next options, and post-switch behavior remain customizable in
`src/providers/i18n/runtime.ts`. Shared UI components live in
`src/components/ui` and follow the shadcn Base UI conventions.

Stable NocoBase runtime behavior is provided by `@nocobase/portal-sdk`.
The template records its inherited base version in
`nocobase.defaultTemplateVersion`; SDK installation, development, and builds
stop with an actionable error when that version is outside the SDK's supported
range. Application composition and visual source remain owned by this project.

## Extensions

Installed extensions live in `src/extensions` and are ordinary
application-owned source files. Their providers, resources, routes, login
adapters, and user-menu items are discovered automatically.

Set `registryRoutesEnabled` to `false` in `src/routes.tsx` when replacing the
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
npm template contains the default extensions under `src/extensions` instead.

## Authentication

Basic username or email and password login is built in. The default login page
also renders enabled NocoBase authentication methods when their frontend
Registry adapters are installed.

Customize `src/pages/login/index.tsx` to replace the whole login page, or use
`DefaultSignInPage` to keep dynamic authentication while overriding individual
authenticator UI.

## Source repository checks

```bash
pnpm --dir sdk test
node tests/auth-session-regression.mjs
node registry/nocobase-acl/tests/acl-regression.mjs
node registry/nocobase-i18n/tests/i18n-regression.mjs
node --experimental-strip-types --test tests/file-upload-regression.test.ts
node registry/nocobase-mail/tests/mail-regression.mjs
node registry/nocobase-route-surfaces/tests/route-surfaces-regression.mjs
```

Registry source checks are maintainer commands for this source repository; the
published template contains materialized extensions instead of `registry/`.
SDK breaking-change releases and project upgrade steps are documented in the
[Portal SDK migration guide](https://github.com/nocobase/portal-template-default/blob/main/sdk/MIGRATION.md).

## Learn more

- [NocoBase documentation](https://docs.nocobase.com/)
- [Refine documentation](https://refine.dev/docs/)
- [shadcn/ui documentation](https://ui.shadcn.com/)

## License

MIT
