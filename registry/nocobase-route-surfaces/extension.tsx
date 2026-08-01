import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import { Layers3 } from "lucide-react";
import { lazy } from "react";
import { Route } from "react-router";
import { LazyRouteSurfaceDemo } from "./demo/lazy-route";

const DemoHome = lazy(() =>
  import("./demo").then((module) => ({
    default: module.RouteSurfacesDemoHome,
  }))
);
const DemoDrawer = lazy(() =>
  import("./demo").then((module) => ({ default: module.DemoDrawerRoute }))
);
const DemoSecondDrawer = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DemoSecondDrawerRoute,
  }))
);
const DemoDialog = lazy(() =>
  import("./demo").then((module) => ({ default: module.DemoDialogRoute }))
);
const DemoPage = lazy(() =>
  import("./demo").then((module) => ({ default: module.DemoPageRoute }))
);
const DemoPageDrawer = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DemoPageDrawerRoute,
  }))
);
const DemoPageDrawerDialog = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DemoPageDrawerDialogRoute,
  }))
);
const DemoContextualHome = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DemoContextualHomeRoute,
  }))
);
const DemoContextualList = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DemoContextualListRoute,
  }))
);
const DemoContextualDetail = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DemoContextualDetailRoute,
  }))
);
const DemoContextualCreate = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DemoContextualCreateRoute,
  }))
);
const DemoContextualEdit = lazy(() =>
  import("./demo").then((module) => ({
    default: module.DemoContextualEditRoute,
  }))
);

const routeSurfacesExtension: AppExtension = {
  id: "nocobase-route-surfaces",
  dev: {
    resources: [
      {
        name: "route-surfaces",
        list: "route-surfaces",
        meta: {
          label: "Route surfaces",
          icon: <Layers3 />,
          description:
            "URL-backed drawer, dialog, page, and nested route patterns.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: (
      <>
        <Route
          key="route-surfaces-overlays"
          path="route-surfaces"
          element={
            <LazyRouteSurfaceDemo>
              <DemoHome />
            </LazyRouteSurfaceDemo>
          }
        >
          <Route
            path="drawer"
            element={
              <LazyRouteSurfaceDemo>
                <DemoDrawer />
              </LazyRouteSurfaceDemo>
            }
          >
            <Route
              path="second"
              element={
                <LazyRouteSurfaceDemo>
                  <DemoSecondDrawer />
                </LazyRouteSurfaceDemo>
              }
            />
          </Route>
          <Route
            path="dialog"
            element={
              <LazyRouteSurfaceDemo>
                <DemoDialog />
              </LazyRouteSurfaceDemo>
            }
          />
        </Route>
        <Route
          key="route-surfaces-page"
          path="route-surfaces/page"
          element={
            <LazyRouteSurfaceDemo>
              <DemoPage />
            </LazyRouteSurfaceDemo>
          }
        >
          <Route
            path="drawer"
            element={
              <LazyRouteSurfaceDemo>
                <DemoPageDrawer />
              </LazyRouteSurfaceDemo>
            }
          >
            <Route
              path="dialog"
              element={
                <LazyRouteSurfaceDemo>
                  <DemoPageDrawerDialog />
                </LazyRouteSurfaceDemo>
              }
            />
          </Route>
        </Route>
        <Route
          key="route-surfaces-contextual"
          path="route-surfaces/contextual"
          element={
            <LazyRouteSurfaceDemo>
              <DemoContextualHome />
            </LazyRouteSurfaceDemo>
          }
        >
          <Route
            path="list"
            element={
              <LazyRouteSurfaceDemo>
                <DemoContextualList />
              </LazyRouteSurfaceDemo>
            }
          >
            <Route
              path="create"
              element={
                <LazyRouteSurfaceDemo>
                  <DemoContextualCreate />
                </LazyRouteSurfaceDemo>
              }
            />
            <Route
              path="detail/:id"
              element={
                <LazyRouteSurfaceDemo>
                  <DemoContextualDetail />
                </LazyRouteSurfaceDemo>
              }
            >
              <Route
                path="edit"
                element={
                  <LazyRouteSurfaceDemo>
                    <DemoContextualEdit />
                  </LazyRouteSurfaceDemo>
                }
              />
            </Route>
            <Route
              path="edit/:id"
              element={
                <LazyRouteSurfaceDemo>
                  <DemoContextualEdit />
                </LazyRouteSurfaceDemo>
              }
            />
          </Route>
        </Route>
      </>
    ),
  },
};

export default routeSurfacesExtension;
