import { Refine, type ResourceProps } from "@refinedev/core";

import { BrowserRouter } from "react-router";
import routerProvider, {
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { dataProvider } from "./providers/data";
import { DocumentTitleHandler } from "./components/app-shell/document-title-handler";
import { useNotificationProvider } from "./components/notifications/use-notification-provider";
import { Toaster } from "./components/notifications/toaster";
import { ThemeProvider } from "./components/theme/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { BrandLogo } from "./components/app-shell/brand";
import { AppAuthRuntimeProviders, extensionResources } from "./app/extensions";
import "./App.css";
import { authProvider } from "./providers/auth";
import { accessControlProvider } from "./providers/access-control";
import { i18nProvider } from "./providers/i18n";
import { SystemSettingsProvider } from "./providers/system-settings";
import { getPortalBase } from "./providers/runtime-config";
import { AclStoreProvider, aclStore } from "./lib/nocobase/acl";
import { AppRoutes } from "./app/routes";

const getResourcePriority = (resource: ResourceProps) =>
  typeof resource.meta?.priority === "number" ? resource.meta.priority : 100;

const appResources = [...extensionResources].sort(
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
                  <AppRoutes />

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
