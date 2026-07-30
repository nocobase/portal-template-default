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

Application translations live in `src/locales`. Shared UI components live in
`src/components/ui` and follow the shadcn Base UI conventions.

## Extensions

Installed extensions live in `src/extensions` and are ordinary
application-owned source files. Their providers, resources, routes, login
adapters, and user-menu items are discovered automatically.

Optional NocoBase integrations, including authentication methods and i18n, can
be installed from the `@nocobase` Registry configured in `components.json`.
After installation, the generated source can be customized and committed with
the application.

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

## Tests

```bash
pnpm test:auth
pnpm test:acl
pnpm test:i18n
```

## Learn more

- [NocoBase documentation](https://docs.nocobase.com/)
- [Refine documentation](https://refine.dev/docs/)
- [shadcn/ui documentation](https://ui.shadcn.com/)

## License

MIT
