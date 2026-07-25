import { Refine, Authenticated, type ResourceProps } from "@refinedev/core";

import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import routerProvider, {
  CatchAllNavigate,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import {
  UserCreate,
  UserEdit,
  UserResourceLayout,
  RoleDetailRoute,
  userRoutes,
  UserShow,
} from "./pages/users";
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
import { ResourceAccessGuard } from "./components/access-control/resource-access-guard";
import { NavigateToAccessibleResource } from "./components/access-control/navigate-to-accessible-resource";
import { KeyRound, PanelsTopLeft, UsersRound } from "lucide-react";
import { i18nProvider } from "./providers/i18n";
import { SystemSettingsProvider } from "./providers/system-settings";
import { AuthDemoPage } from "./components/auth/demo";

const coreResources: ResourceProps[] = [
  {
    name: "users",
    list: userRoutes.list,
    create: userRoutes.create,
    edit: userRoutes.edit,
    show: userRoutes.show,
    meta: {
      label: "Users",
      singularLabel: "User",
      i18nKey: "resources.users",
      i18nSingularKey: "resources.user",
      i18nOptions: { ns: "app" },
      descriptionI18nKey: "resources.users.description",
      icon: <UsersRound />,
      description:
        "Manage the people who can sign in and work in this NocoBase application.",
      canCreate: true,
      canDelete: true,
      acl: {
        type: "collection",
      },
    },
  },
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

const basename = import.meta.env.BASE_URL.replace(/\/+$/, "");

function App() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <AppAuthRuntimeProviders>
        <ThemeProvider>
          <TooltipProvider>
            <SystemSettingsProvider>
            <Refine
              dataProvider={dataProvider}
              notificationProvider={useNotificationProvider()}
              routerProvider={routerProvider}
              authProvider={authProvider}
              accessControlProvider={accessControlProvider}
              i18nProvider={i18nProvider}
              resources={[...coreResources, ...extensionResources]}
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
                <Route
                  path="/users"
                  element={<UserResourceLayout />}
                >
                  <Route
                    path="create"
                    element={
                      <ResourceAccessGuard resource="users" action="create">
                        <UserCreate />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="edit/:id"
                    element={
                      <ResourceAccessGuard resource="users" action="edit">
                        <UserEdit />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="roles/:roleName"
                    element={
                      <ResourceAccessGuard resource="roles" action="show">
                        <RoleDetailRoute returnTo="list" />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="show/:id"
                    element={
                      <ResourceAccessGuard resource="users" action="show">
                        <UserShow />
                      </ResourceAccessGuard>
                    }
                  >
                    <Route
                      path="edit"
                      element={
                        <ResourceAccessGuard resource="users" action="edit">
                          <UserEdit returnTo="show" />
                        </ResourceAccessGuard>
                      }
                    />
                    <Route
                      path="roles/:roleName"
                      element={
                        <ResourceAccessGuard resource="roles" action="show">
                          <RoleDetailRoute returnTo="show" />
                        </ResourceAccessGuard>
                      }
                    />
                  </Route>
                </Route>
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
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>
            </Routes>

            <Toaster />
            <UnsavedChangesNotifier />
            <DocumentTitleHandler appName="NocoBase" />
            </Refine>
            </SystemSettingsProvider>
          </TooltipProvider>
        </ThemeProvider>
      </AppAuthRuntimeProviders>
    </BrowserRouter>
  );
}

export default App;
