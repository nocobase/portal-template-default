# Route surfaces

Route surfaces keep URL navigation separate from visual presentation. The same
business content can be hosted by a routed drawer, dialog, or full page.

In development, the Registry also installs a lazy-loaded Demo route at
`/dev/route-surfaces` with
live drawer, dialog, child-page, nested-drawer, and mixed page/drawer/dialog
scenarios, a `defineAppRoutes` resource-action guide, and a Prompt generator.

`resourceAction` binds a child URL to a Refine resource action; it does not
select a presentation. With the resource route's automatic outlet, the action
element must render a `RouteDrawer` or `RouteDialog`. Use a manual outlet layout
when the child should replace the list as a full page.

## Components

- `RouteDrawer` supports URL-backed nested drawers and push-style stacking.
- `RouteDialog` provides the same close contract for modal routes.
- `RoutePage` provides the close context without an overlay.
- `useRouteSurfaceClose` lets content request a close without knowing how it is
  presented.
- `useRefineUnsavedChangesGuard` adapts Refine's unsaved-change state to the
  route surface close lifecycle and renders a shadcn Alert Dialog confirmation.

Route definitions, ACL guards, resource data fetching, and application-specific
paths remain application concerns.
