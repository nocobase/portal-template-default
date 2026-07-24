# NocoBase i18n

Optional frontend-owned internationalization for the NocoBase Admin Starter.

The Registry connects i18next to the application translation provider, persists
the selected locale through the Starter's shared NocoBase client, sends it as
`X-Locale`, and adds a reusable language switcher to the signed-in user menu.
Its integrated Demo route shows the complete configuration model without
requiring a second Registry item.

Starter and Registry UI resources remain frontend-owned. At startup the runtime
reads `enabledLanguages` from `systemSettings:get` and merges only registered
dynamic NocoBase namespaces from `app:getLang`; `lm-collections` is registered
by default so collection and field translations remain compatible.

Application-owned React translations belong in `src/locales`, outside the
installed Registry directory. Register them through the Starter-level
`registerTranslationResources` helper so the application remains buildable when
the optional i18n Registry is not installed. When this Registry is present, it
consumes both resources registered before startup and resources added later by
lazy features.

On NocoBase versions that support filtered language resources, the request uses
`app:getLang?ns=lm-collections,...`. Older servers ignore the query parameter;
the client still merges only registered namespaces, so the integration remains
backward compatible.

Other installed components can register their own namespace without changing
the runtime:

```ts
import { registerLocaleResources } from "@/extensions/nocobase-i18n";

registerLocaleResources("my-extension", {
  "en-US": { title: "Orders" },
  "zh-CN": { title: "订单" },
});
```

If a component relies on another server-generated namespace, opt in explicitly:

```ts
import { registerServerResourceNamespace } from "@/extensions/nocobase-i18n";

registerServerResourceNamespace("my-dynamic-namespace");
```

Namespaces registered after application startup are loaded incrementally, so
lazy Registry components do not need to participate in the initial request.

Use the application's `useTranslate` hook in React components. Existing exact
NocoBase-style expressions such as `{{t("Orders")}}` and expressions with a
string namespace are resolved through the Starter compatibility helper.
