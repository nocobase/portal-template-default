# Application Development Guidelines

This repository is a starter for building a NocoBase-powered application. Keep changes focused on the application being built and follow these guidelines before introducing new abstractions.

## Reuse existing extensions

Before writing new code, inspect `registry` in the Registry source repository or `src/extensions` in a published template for similar pages, hooks, components, and integration patterns. Reuse an existing implementation directly when it already fits the requirement, and extend or compose it when only a small adaptation is needed.

## Customize UI components through composition

Treat `src/components/ui` as the project's shadcn/ui foundation. When application-specific behavior or styling is needed, prefer wrapping, pre-composing, or re-exporting the base component from a feature-level component instead of editing the base component directly. This keeps the base components replaceable and makes future updates easier to review.

Components copied from shadcn/ui are owned and maintained by this project; upstream changes are not applied automatically. If a base component must be changed or updated, compare it with the upstream version first, then selectively merge bug fixes and improvements while preserving intentional local behavior. Do not blindly overwrite customized components.

### Compose form controls with `render`

This template uses the Base UI variant of shadcn/ui. Always compose a form input through the required `FormControl` `render` prop, for example `<FormControl render={<Input {...field} />} />`. Never pass the input as `FormControl` children. Keep `FormControl` inside the corresponding `FormField` render subtree, normally within `FormItem`, so it can read the field context and attach validation and accessibility attributes to the rendered input.

## Define application routes once

Put application-owned business routes in `src/routes.tsx` with `defineAppRoutes`. A route with a `resource` entry contributes its Refine resource and navigation item, while the same definition generates its React Router route. Mark create, edit, and show children with `resourceAction` so their paths populate the same Refine resource instead of being repeated. Use `access.roles` for route-level role constraints; nested routes inherit parent constraints, and the runtime applies the complete chain to both menu visibility and direct URL access. Do not repeat those roles in `resource.meta.acl` or a manually written route guard.

Give every resource route a real path such as `/dashboard`. Do not combine `index: true` with `resource` or `resourceAction`; the application index is reserved for navigation to the first accessible menu route.

`resourceAction` assigns a child path to the parent Refine resource's create, edit, or show URL; it does not choose the presentation. The automatic outlet keeps the resource page mounted, so the child must render `RouteDrawer` or `RouteDialog`; use `outlet: "manual"` when a full page should replace the list or needs custom nesting.

Every page intended to appear in the sidebar must declare both its route and a `resource` entry; a route element alone is not a menu item.

The bundled Registry routes are examples, not application structure. When beginning the real application, set `registryRoutesEnabled` to `false` in `src/routes.tsx` and define the application's own routes there. This removes Registry-contributed main routes, resources, and navigation without modifying installed extension source; extension providers, authentication adapters, and `/dev` showcases remain available.

Route access currently centralizes role constraints only. Keep NocoBase resource/action, region, field, and record checks in the existing `CanAccess` and ACL boundaries close to the protected query or UI. Server ACL remains authoritative.

## Develop Portal Registry items

Canonical NocoBase Registry source lives under `registry/`. In this source repository, normal development and builds load it directly; do not copy it into `src/extensions` for preview. Registry items must import stable Portal runtime, client, authentication, ACL, routing, and extension contracts from documented `@nocobase/portal-sdk` exports. Imports to user-owned host UI and composition must use the `@/` alias. Relative imports must stay within that Registry item's own root so the item remains portable after installation. Registry items target this Portal Template's React, shadcn Base UI, and pnpm toolchain. They must never import Ant Design or NocoBase's Ant Design-based client components.

Keep Registry items portable and focused on reusable API adapters, hooks, components, and small demos. Update `registry.config.json` whenever an item's files, dependencies, or installation target changes. Validate Registry changes with the normal application build and the relevant regression scripts.
