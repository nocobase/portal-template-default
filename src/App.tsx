import { Refine, Authenticated, type ResourceProps } from "@refinedev/core";

import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import routerProvider, {
  CatchAllNavigate,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import {
  BlogPostList,
  BlogPostCreate,
  BlogPostEdit,
  BlogPostShow,
} from "./pages/blog-posts";
import {
  CategoryList,
  CategoryCreate,
  CategoryEdit,
  CategoryShow,
} from "./pages/categories";
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
  extensionResources,
  extensionRouteElements,
} from "./app/extensions";
import "./App.css";
import { authProvider } from "./providers/auth";
import { accessControlProvider } from "./providers/access-control";
import { AclBootstrap } from "./components/access-control/acl-bootstrap";
import { ResourceAccessGuard } from "./components/access-control/resource-access-guard";
import { NavigateToAccessibleResource } from "./components/access-control/navigate-to-accessible-resource";
import { FileText, Tags } from "lucide-react";

const coreResources: ResourceProps[] = [
  {
    name: "blog_posts",
    list: "/blog-posts",
    create: "/blog-posts/create",
    edit: "/blog-posts/edit/:id",
    show: "/blog-posts/show/:id",
    meta: {
      label: "Blog posts",
      icon: <FileText />,
      description:
        "Create and publish content on a reliable NocoBase data foundation.",
      canCreate: true,
      canDelete: true,
      acl: {
        type: "collection",
      },
    },
  },
  {
    name: "categories",
    list: "/categories",
    create: "/categories/create",
    edit: "/categories/edit/:id",
    show: "/categories/show/:id",
    meta: {
      label: "Categories",
      icon: <Tags />,
      description:
        "Organize reusable structures while NocoBase keeps the underlying data consistent.",
      canCreate: true,
      canDelete: true,
      acl: {
        type: "collection",
      },
    },
  },
];

const basename = import.meta.env.BASE_URL.replace(/\/+$/, "");

function App() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <ThemeProvider>
        <TooltipProvider>
          <Refine
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider()}
            routerProvider={routerProvider}
            authProvider={authProvider}
            accessControlProvider={accessControlProvider}
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
                <Route
                  index
                  element={<NavigateToAccessibleResource />}
                />
                <Route path="/blog-posts">
                  <Route
                    index
                    element={
                      <ResourceAccessGuard resource="blog_posts" action="list">
                        <BlogPostList />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="create"
                    element={
                      <ResourceAccessGuard resource="blog_posts" action="create">
                        <BlogPostCreate />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="edit/:id"
                    element={
                      <ResourceAccessGuard resource="blog_posts" action="edit">
                        <BlogPostEdit />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="show/:id"
                    element={
                      <ResourceAccessGuard resource="blog_posts" action="show">
                        <BlogPostShow />
                      </ResourceAccessGuard>
                    }
                  />
                </Route>
                <Route path="/categories">
                  <Route
                    index
                    element={
                      <ResourceAccessGuard resource="categories" action="list">
                        <CategoryList />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="create"
                    element={
                      <ResourceAccessGuard resource="categories" action="create">
                        <CategoryCreate />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="edit/:id"
                    element={
                      <ResourceAccessGuard resource="categories" action="edit">
                        <CategoryEdit />
                      </ResourceAccessGuard>
                    }
                  />
                  <Route
                    path="show/:id"
                    element={
                      <ResourceAccessGuard resource="categories" action="show">
                        <CategoryShow />
                      </ResourceAccessGuard>
                    }
                  />
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
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>
            </Routes>

            <Toaster />
            <UnsavedChangesNotifier />
            <DocumentTitleHandler appName="NocoBase" />
          </Refine>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
