import type { ResourceProps } from "@refinedev/core";
import {
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
} from "react";
import { Outlet, Route } from "react-router";

import type { ResourceAcl, RouteAccessConstraint } from "@/lib/nocobase/acl";
import { RouteAccessGuard } from "./route-access-guard";

export { RouteAccessGuard } from "./route-access-guard";

type ResourceRouteAction = "create" | "edit" | "show";

export type AppRouteResource = Omit<
  ResourceProps,
  "name" | "list" | ResourceRouteAction
>;

type AppRouteBase = {
  name: string;
  element?: ReactNode;
  access?: RouteAccessConstraint;
  outlet?: "auto" | "manual";
};

type AppRouteResourceBinding =
  | {
      resource: AppRouteResource;
      resourceAction?: never;
    }
  | {
      resource?: never;
      resourceAction: ResourceRouteAction;
    }
  | {
      resource?: never;
      resourceAction?: never;
    };

type AppIndexRouteDefinition = AppRouteBase &
  AppRouteResourceBinding & {
    index: true;
    path?: never;
    children?: never;
  };

type AppPathRouteDefinition = AppRouteBase &
  AppRouteResourceBinding & {
    index?: false;
    path?: string;
    children?: AppRouteDefinition[];
  };

export type AppRouteDefinition =
  | AppIndexRouteDefinition
  | AppPathRouteDefinition;

export function defineAppRoutes<const Routes extends AppRouteDefinition[]>(
  routes: Routes
) {
  return routes;
}

const joinRoutePath = (parentPath: string, path?: string) => {
  if (!path) return parentPath || "/";
  if (path.startsWith("/")) return path;
  return `${parentPath.replace(/\/$/, "")}/${path}`.replace(/\/+/g, "/");
};

const getResourceActionRoutes = (
  routes: AppRouteDefinition[],
  parentPath: string,
  resourceName: string,
  actions: Partial<Record<ResourceRouteAction, string>> = {}
): Partial<Record<ResourceRouteAction, string>> => {
  for (const route of routes) {
    if (route.resource) continue;
    const fullPath = joinRoutePath(parentPath, route.path);
    if (route.resourceAction) {
      if (actions[route.resourceAction] !== undefined) {
        throw new Error(
          `Resource "${resourceName}" declares multiple ${route.resourceAction} routes.`
        );
      }
      actions[route.resourceAction] = fullPath;
    }
    getResourceActionRoutes(
      route.children ?? [],
      fullPath,
      resourceName,
      actions
    );
  }

  return actions;
};

const getDefaultResourceAcl = (meta?: ResourceProps["meta"]): ResourceAcl =>
  typeof meta?.acl === "undefined"
    ? { type: "authenticated" }
    : (meta.acl as ResourceAcl);

export function buildRouteResources(
  routes: AppRouteDefinition[],
  parentPath = "",
  parentResource?: string,
  inheritedAccess: RouteAccessConstraint[] = []
): ResourceProps[] {
  return routes.flatMap((route) => {
    if (route.resourceAction && !parentResource) {
      throw new Error(
        `Route "${route.name}" declares resourceAction without a parent resource.`
      );
    }

    const fullPath = joinRoutePath(parentPath, route.path);
    const routeAccess = route.access
      ? [...inheritedAccess, route.access]
      : inheritedAccess;
    const resource = route.resource
      ? {
          name: route.name,
          list: route.index
            ? parentPath || "/"
            : route.path
            ? fullPath
            : undefined,
          ...getResourceActionRoutes(
            route.children ?? [],
            fullPath,
            route.name
          ),
          ...route.resource,
          meta: {
            ...route.resource.meta,
            parent: route.resource.meta?.parent ?? parentResource,
            acl: getDefaultResourceAcl(route.resource.meta),
            routeAccess: routeAccess.length ? routeAccess : undefined,
          },
        }
      : undefined;
    const childResources = buildRouteResources(
      route.children ?? [],
      fullPath,
      resource ? route.name : parentResource,
      routeAccess
    );

    return resource ? [resource, ...childResources] : childResources;
  });
}

const hasResourceActionRoute = (routes: AppRouteDefinition[]): boolean =>
  routes.some(
    (route) =>
      Boolean(route.resourceAction) ||
      hasResourceActionRoute(route.children ?? [])
  );

export function renderAppRoutes(routes: AppRouteDefinition[]): ReactElement[] {
  return routes.map((route) => {
    // resourceAction only binds Refine action paths. This provides the mount
    // point that keeps the resource page mounted; the child element still owns
    // whether it renders a drawer, dialog, or other presentation. A specialized
    // layout can opt out and place or consume the outlet itself.
    const content =
      route.element &&
      route.resource &&
      route.outlet !== "manual" &&
      hasResourceActionRoute(route.children ?? [])
        ? createElement(
            Fragment,
            null,
            route.element,
            createElement(Outlet)
          )
        : route.element ?? createElement(Outlet);
    const element = route.access
      ? createElement(RouteAccessGuard, { access: route.access }, content)
      : content;

    return route.index
      ? createElement(Route, {
          key: route.name,
          index: true,
          element,
        })
      : createElement(
          Route,
          {
            key: route.name,
            path: route.path,
            element,
          },
          renderAppRoutes(route.children ?? [])
        );
  });
}
