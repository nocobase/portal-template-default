# nocobase-admin-starter

## NocoBase configuration

Copy `.env.example` to `.env.local` and set the NocoBase API URL. The default `basic` authenticator uses the NocoBase username or email and password login. For local development, a temporary access token can be supplied through `NOCOBASE_API_TOKEN`; do not commit it. The data provider sends it as `Authorization: Bearer <token>`.

If you call a remote NocoBase instance from `http://localhost:*`, the browser may block `auth:signIn` because NocoBase requires the `X-Authenticator` request header and the remote server must explicitly allow it in CORS preflight responses. In local Vite development, prefer using the built-in dev proxy:

```env
NOCOBASE_API_URL=https://develop.v2.test.nocobase.com/nocobase/api/__app/cms
```

In development, the app auto-detects the proxy target from `NOCOBASE_API_URL` when that value is an absolute URL. The configured API URL can stay on the original sub-app path such as `/nocobase/api/__app/cms`.

Refine resource names must match NocoBase collection names. For example, the supplied Swagger document exposes `collectionCategories`, so use that name when registering a corresponding Refine resource.

## Available Scripts

### Running the development server.

```bash
pnpm dev
```

### Building for production.

```bash
pnpm build
```

### Extensions and the NocoBase Shadcn Registry

The starter separates framework-owned extension support from installed Registry
source:

- `src/app/extension.ts` defines the generic extension contract.
- `src/app/extensions.tsx` discovers `src/extensions/*/extension.tsx` and adds
  its providers, Refine resources, and routes to the app.
- `registry/<name>` contains the canonical authoring source for a Registry
  package while it is developed in this repository.
- `src/extensions/<name>` contains installed source. The directory is ignored by
  Git so Registry source is not committed twice.

`extensions.json` declares which extensions the starter expects, and
`extensions.lock.json` records where their Registry items can be resolved. The
`postinstall` hook runs the generic missing-extension installer. If a target
directory already exists, the installer skips it completely and preserves all
local changes. It only installs an extension when its target directory is
missing.

You can run the same missing-only installation explicitly with:

```bash
pnpm extensions:install
```

This repository currently authors three incremental NocoBase AI entries:

- `ai-runtime` provides AI services, providers, transports, and
  controllers. Its NocoBase requests use the starter's shared
  `src/lib/nocobase/client.ts` client.
- `ai-chat` adds the reusable chat components and depends on the
  runtime entry.
- `ai` adds the Refine extension integration and Demo pages and depends on the
  chat entry.

To refresh the ignored local preview from the canonical Registry source, run:

```bash
pnpm registry:preview
```

This is the only command that intentionally replaces the local preview at
`src/extensions/nocobase-ai`. Normal `pnpm dev`, `pnpm install`, and
`pnpm extensions:install` do not overwrite an installed extension.

Build the standard Shadcn Registry JSON files into `public/r` with:

```bash
pnpm registry:build
```

With the development server running, a compatible starter can also add the
complete item through Shadcn:

```bash
pnpm dlx shadcn@latest add @nocobase/ai
```

The Registry alias is configured in `components.json` and resolves to
`http://localhost:5173/r/{name}.json` during local development. The same generic
extension host and installation manifest can be reused for future Registry
packages without adding package-specific logic to `App.tsx` or the installer.

### Running the production server.

```bash
pnpm start
```

## Learn More

To learn more about **Refine**, please check out the [Documentation](https://refine.dev/docs)

- **REST Data Provider** [Docs](https://refine.dev/docs/core/providers/data-provider/#overview)
- **shadcn/ui** [Docs](https://refine.dev/docs/guides-concepts/general-concepts/#headless-concept)
- **React Router** [Docs](https://refine.dev/docs/core/providers/router-provider/)
- **Custom Auth Provider** [Docs](https://refine.dev/docs/core/providers/auth-provider/)

## License

MIT
