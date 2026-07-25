# nocobase-admin-starter

![2026-07-22-08-48-12](https://static-docs.nocobase.com/2026-07-22-08-48-12.png)

## NocoBase configuration

Copy `.env.example` to `.env.local` and set the NocoBase API URL. The default `basic` authenticator uses the NocoBase username or email and password login. For local development, a temporary access token can be supplied through `NOCOBASE_API_TOKEN`; do not commit it. The data provider sends it as `Authorization: Bearer <token>`.

If you call a remote NocoBase instance from `http://localhost:*`, the browser may block `auth:signIn` because NocoBase requires the `X-Authenticator` request header and the remote server must explicitly allow it in CORS preflight responses. In local Vite development, prefer using the built-in dev proxy:

```env
NOCOBASE_API_URL=https://develop.v2.test.nocobase.com/nocobase/api/__app/cms
```

In development, the app auto-detects the proxy target from `NOCOBASE_API_URL` when that value is an absolute URL. The configured API URL can stay on the original sub-app path such as `/nocobase/api/__app/cms`.

Application resource names must match NocoBase collection names. The included
Users example targets the default `users` collection, so it works without a
project-specific business collection.

Application-owned React translations live in `src/locales`. The entry registers
an `app` namespace for business pages and augments the default `starter`
namespace for shared controls. Feature-specific Registry translations remain
inside their own extension namespace and are not mixed into application locale
files.

### Authentication UI

The default login page calls `authenticators:publicList` and renders every
enabled NocoBase authenticator that has a frontend adapter installed. Basic
username/password authentication is built into the Starter. Optional methods
are installed independently:

```bash
pnpm exec shadcn add @nocobase/auth-sms
pnpm exec shadcn add @nocobase/auth-ldap
pnpm exec shadcn add @nocobase/auth-oidc
pnpm exec shadcn add @nocobase/auth-saml
pnpm exec shadcn add @nocobase/auth-cas
pnpm exec shadcn add @nocobase/auth-wecom
pnpm exec shadcn add @nocobase/auth-dingtalk
```

The application login page remains the customization boundary. Keep the
default dynamic page with:

```tsx
import { DefaultSignInPage } from "@/components/auth/default-sign-in-page"

export const Login = () => <DefaultSignInPage />
```

To replace only one authenticator UI, use `renderAuthenticator` and return the
default element for everything else:

```tsx
import { DefaultSignInPage } from "@/components/auth/default-sign-in-page"
import { useOidcSignIn } from "@/extensions/nocobase-auth-oidc"
import { Button } from "@/components/ui/button"

function CompanyOidcButton({ authenticator }) {
  const oidc = useOidcSignIn(authenticator)
  return <Button onClick={oidc.signIn}>Company SSO</Button>
}

export const Login = () => (
  <DefaultSignInPage
    renderAuthenticator={({ authenticator, defaultElement }) =>
      authenticator.name === "company-oidc" ? (
        <CompanyOidcButton authenticator={authenticator} />
      ) : (
        defaultElement
      )
    }
  />
)
```

Replace `src/pages/login/index.tsx` completely when the application needs a
fully custom login page. Token callback capture, current authenticator storage,
request headers, and logout behavior remain provided by the Starter runtime and
do not depend on `DefaultSignInPage`.

```tsx
import { AuthLayout } from "@/components/auth/auth-layout"
import { BasicSignInForm } from "@/components/auth"

export const Login = () => (
  <AuthLayout title="Sign in" description="Continue to your workspace.">
    <BasicSignInForm
      authenticator={{
        name: "basic",
        authType: "Email/Password",
      }}
    />
  </AuthLayout>
)
```

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
- `src/extensions/<name>` contains installed, application-owned source.
  Downstream applications can commit this directory like any other source code.

`registry.config.json` is the only authoring manifest. In addition to standard
Shadcn Registry item fields, each item has a local `source` mapping used to
generate its standard `files` array. The same mapping lets the starter's
`postinstall` hook copy a locally authored extension only when its target is
missing. Existing installed source is never compared, updated, or overwritten.
Optional entries can set `source.install` to `false`; they remain available to
Registry builds and local previews but are not added by `postinstall`.

You can run the same missing-only installation explicitly with:

```bash
pnpm registry:install
```

This repository authors optional NocoBase integration entries. Internationalization
is delivered as one cohesive Registry entry:

- `i18n` extends the Starter's built-in translation provider and shared System
  Settings bootstrap with selected server-generated namespaces such as
  `lm-collections`, user locale persistence, the language switcher, and the
  lazy-loaded showcase with its prompt generator.

The AI integration is available through four incremental entries:

- `ai-runtime` provides AI services, providers, transports, and
  controllers. Its NocoBase requests use the starter's shared
  `src/lib/nocobase/client.ts` client.
- `ai-chat` adds the reusable chat components and depends on the
  runtime entry.
- `ai-react-hook-form` adds the optional React Hook Form adapter for the fixed
  Form filler Tool.
- `ai` adds the application extension integration and Demo pages and depends on the
  chat entry.

To refresh the local preview from the canonical Registry source, run:

```bash
pnpm registry:preview
```

This is the only command that intentionally replaces the local preview at
`src/extensions/nocobase-ai`. Normal `pnpm dev`, `pnpm install`, and
`pnpm registry:install` do not overwrite an installed extension.

Build the standard Shadcn Registry JSON files into `public/r` with:

```bash
pnpm registry:build
```

With the development server running, a compatible starter can also add the
complete item through Shadcn:

```bash
pnpm dlx shadcn@latest add @nocobase/ai
```

Install the optional NocoBase i18n integration with:

```bash
pnpm dlx shadcn@latest add @nocobase/i18n
```

Shadcn does not keep a Registry item lock or merge local changes. Re-running
`add` downloads the current item, skips identical files, and asks before
replacing different files. Use `--diff` to inspect an update and `--overwrite`
to accept the Registry version explicitly.

The Registry alias is configured in `components.json` and resolves to
`http://localhost:5173/r/{name}.json` during local development. The same generic
extension host and Registry source mapping can be reused for future Registry
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
