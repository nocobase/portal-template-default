# nocobase-admin-starter

![2026-07-22-08-48-12](https://static-docs.nocobase.com/2026-07-22-08-48-12.png)

## NocoBase configuration

Copy `.env.example` to `.env.local` and set the NocoBase API URL. The default `basic` authenticator uses the NocoBase username or email and password login. For local development, a temporary access token can be supplied through `NOCOBASE_API_TOKEN`; do not commit it. The data provider sends it as `Authorization: Bearer <token>`.

If you call a remote NocoBase instance from `http://localhost:*`, the browser may block `auth:signIn` because NocoBase requires the `X-Authenticator` request header and the remote server must explicitly allow it in CORS preflight responses. In local Vite development, prefer using the built-in dev proxy:

```env
NOCOBASE_API_URL=https://develop.v2.test.nocobase.com/nocobase/api/__app/cms
```

In development, the app auto-detects the proxy target from `NOCOBASE_API_URL` when that value is an absolute URL. The configured API URL can stay on the original sub-app path such as `/nocobase/api/__app/cms`.

The Portal uses the same authentication storage contract as the main NocoBase
frontend. `API_CLIENT_STORAGE_PREFIX`, `API_CLIENT_STORAGE_TYPE`, and
`API_CLIENT_SHARE_TOKEN` are supported when the server customizes those
settings. Main-app keys use the base prefix (for example `NOCOBASE_TOKEN`),
while sub-app keys are scoped by app name (for example
`NOCOBASE_CMS_TOKEN`). The app name is inferred from the Portal base/API URL.

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

The Starter includes an Authentication Demo for the three customization
boundaries below. Each optional authentication Registry adds its own component
Demo under the same Authentication menu when installed.

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

The repository has separate Registry-authoring and published-template modes:

- `src/app/extension.ts` defines the generic extension contract.
- In this source repository, `src/app/extensions.tsx` discovers
  `registry/*/extension.tsx` directly. Registry authors edit canonical files and
  use the normal `pnpm dev` and `pnpm build` commands without copying them first.
- The published npm template does not contain `registry/`. Its default Registry
  items are materialized into `src/extensions` by the release pipeline, so an
  application created from the package uses the same extension host without a
  Registry-authoring layer.
- Source installed later into `src/extensions/<name>` is application-owned and
  can be committed and customized like any other application source.

`registry.config.json` is the only authoring manifest. In addition to standard
Shadcn Registry item fields, each item has a local `source` mapping used to
generate its standard `files` array and its release-time installation target.
Items with `source.install: false` remain available from the Registry but are
not included in the published template by default. There is no `postinstall`
copy or preview synchronization step.

During publication, CI runs `node scripts/registry.mjs materialize` in its
clean, disposable checkout before `npm pack` and `npm publish`. The
script writes the default items directly to `src/extensions` and refuses to
overwrite an existing target. Registry authoring files and the internal release
scripts are excluded from the npm package.

The Registry includes reusable NocoBase integrations and examples:

- `route-surfaces` provides URL-backed page, drawer, and dialog containers.
- `users-example` provides an ACL-aware Users resource built on
  `route-surfaces`.
- `acl-ui` provides reusable access boundaries and role controls, while `acl`
  adds its integrated Demo.
- `auth-*` entries add optional dynamic authentication methods.
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

Optional items can be installed from the Registry service exposed by the
corresponding NocoBase server. For example, a compatible starter can add the
complete AI item through Shadcn:

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

The Registry service URL is configured through the `@nocobase` alias in
`components.json`. The same generic extension host and Registry source mapping
can be reused for future Registry packages without adding package-specific
logic to `App.tsx` or an application installer.

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
