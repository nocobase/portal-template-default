import { Refine, Authenticated, type ResourceProps } from "@refinedev/core";

import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
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
    },
  },
];

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <TooltipProvider>
          <Refine
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider()}
            routerProvider={routerProvider}
            authProvider={authProvider}
            resources={[...coreResources, ...extensionResources]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              projectId: "72Ag5T-38hVrZ-1G44i8",
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
                    <AppExtensionProviders>
                      <Layout>
                        <Outlet />
                      </Layout>
                    </AppExtensionProviders>
                  </Authenticated>
                }
              >
                <Route
                  index
                  element={<NavigateToResource resource="blog_posts" />}
                />
                <Route path="/blog-posts">
                  <Route index element={<BlogPostList />} />
                  <Route path="create" element={<BlogPostCreate />} />
                  <Route path="edit/:id" element={<BlogPostEdit />} />
                  <Route path="show/:id" element={<BlogPostShow />} />
                </Route>
                <Route path="/categories">
                  <Route index element={<CategoryList />} />
                  <Route path="create" element={<CategoryCreate />} />
                  <Route path="edit/:id" element={<CategoryEdit />} />
                  <Route path="show/:id" element={<CategoryShow />} />
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
                    <NavigateToResource />
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
            <DocumentTitleHandler />
          </Refine>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
