import { Refine, Authenticated, type ResourceProps } from "@refinedev/core";

import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import routerProvider, {
  CatchAllNavigate,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { dataProvider } from "./providers/data";
import { Login } from "./pages/login";
import { Register } from "./pages/register";
import { ForgotPassword } from "./pages/forgot-password";
import { ErrorComponent } from "./components/app-shell/error-component";
import { Layout } from "./components/app-shell/layout";
import { DocumentTitleHandler } from "./components/app-shell/document-title-handler";
import { useNotificationProvider } from "./components/notifications/use-notification-provider";
import { Toaster } from "./components/notifications/toaster";
import { ThemeProvider } from "./components/theme/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { BrandLogo } from "./components/app-shell/brand";
import {
  AppExtensionProviders,
  AppAuthRuntimeProviders,
  extensionResources,
  extensionRouteElements,
} from "./app/extensions";
import "./App.css";
import { authProvider } from "./providers/auth";
import { accessControlProvider } from "./providers/access-control";
import { AclBootstrap } from "./components/access-control/acl-bootstrap";
import { NavigateToAccessibleResource } from "./components/access-control/navigate-to-accessible-resource";
import { KeyRound, PanelsTopLeft } from "lucide-react";
import { i18nProvider } from "./providers/i18n";
import { SystemSettingsProvider } from "./providers/system-settings";
import { AuthDemoPage } from "./components/auth/demo";
import { getPortalBase } from "./providers/runtime-config";
import { AclStoreProvider, aclStore } from "./lib/nocobase/acl";

const coreResources: ResourceProps[] = [
  {
    name: "auth-components",
    meta: {
      label: "Authentication",
      icon: <KeyRound />,
      description: "NocoBase authentication UI and integration patterns.",
      acl: { type: "authenticated" },
    },
  },
  {
    name: "auth-patterns",
    list: "/auth",
    meta: {
      parent: "auth-components",
      label: "Login composition",
      icon: <PanelsTopLeft />,
      acl: { type: "authenticated" },
    },
  },
];

const getResourcePriority = (resource: ResourceProps) =>
  typeof resource.meta?.priority === "number" ? resource.meta.priority : 100;

const appResources = [...coreResources, ...extensionResources].sort(
  (left, right) => getResourcePriority(left) - getResourcePriority(right)
);

const basename = getPortalBase().replace(/\/+$/, "");

function App() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <AppAuthRuntimeProviders>
        <ThemeProvider>
          <TooltipProvider>
            <SystemSettingsProvider>
              <AclStoreProvider store={aclStore}>
                <Refine
                  dataProvider={dataProvider}
                  notificationProvider={useNotificationProvider()}
                  routerProvider={routerProvider}
                  authProvider={authProvider}
                  accessControlProvider={accessControlProvider}
                  i18nProvider={i18nProvider}
                  resources={appResources}
                  options={{
                    syncWithLocation: true,
                    warnWhenUnsavedChanges: true,
                    disableTelemetry: true,
                    title: {
                      text: "NocoBase",
                      icon: <BrandLogo className="size-14 rounded-2xl" />,
                    },
                  }}
                >
                  <Routes>
                    <Route
                      element={
                        <Authenticated
                          key="authenticated-inner"
                          fallback={<CatchAllNavigate to="/login" />}
                        >
                          <AclBootstrap>
                            <AppExtensionProviders>
                              <Layout>
                                <Outlet />
                              </Layout>
                            </AppExtensionProviders>
                          </AclBootstrap>
                        </Authenticated>
                      }
                    >
                      <Route index element={<NavigateToAccessibleResource />} />
                      <Route path="/auth" element={<AuthDemoPage />} />
                      {extensionRouteElements}
                      <Route path="*" element={<ErrorComponent />} />
                    </Route>
                    <Route
                      element={
                        <Authenticated
                          key="authenticated-outer"
                          fallback={<Outlet />}
                        >
                          <AclBootstrap>
                            <NavigateToAccessibleResource />
                          </AclBootstrap>
                        </Authenticated>
                      }
                    >
                      <Route path="/login" element={<Login />} />
                      <Route path="/signin" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                      />
                    </Route>
                  </Routes>

                  <Toaster />
                  <UnsavedChangesNotifier />
                  <DocumentTitleHandler appName="NocoBase" />
                </Refine>
              </AclStoreProvider>
            </SystemSettingsProvider>
          </TooltipProvider>
        </ThemeProvider>
      </AppAuthRuntimeProviders>
    </BrowserRouter>
  );
}

export default App;
