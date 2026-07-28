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

The starter only provides the generic extension host:

- `src/app/extension.ts` defines the extension contract.
- `src/app/extensions.tsx` discovers `src/extensions/*/extension.tsx` and adds
  extension providers, resources, routes, authentication adapters, and user-menu
  items to the application.

Registry source is owned and built by the corresponding NocoBase plugins. The
NocoBase CLI installs the Registry items exposed by the enabled plugins into an
AI-development Portal:

```bash
nb portal registry sync <portal-name>
```

Already installed items are skipped by default. Available update modes are:

```bash
nb portal registry sync <portal-name> --diff
nb portal registry sync <portal-name> --overwrite
nb portal registry sync <portal-name> --overwrite --overwrite-ui
```

`--overwrite` refreshes Registry-owned extension files while preserving the
Portal's shared `src/components/ui` primitives. Add `--overwrite-ui` only when
the shared Shadcn components should also be replaced. `--diff` previews changes
without writing them.

The CLI writes the service-backed `@nocobase` Registry alias to
`components.json`. Installed, application-owned source lives under
`src/extensions` and can be reviewed or customized like the rest of the Portal.

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
