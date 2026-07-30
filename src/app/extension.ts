import type { ResourceProps } from "@refinedev/core";
import type { ComponentType, PropsWithChildren, ReactElement } from "react";
import type { AuthenticatorAdapter } from "@/components/auth/types";
import type { AppRouteDefinition } from "./route-runtime";

export type AppExtension = {
  id: string;
  priority?: number;
  resources?: ResourceProps[];
  routes?: ReactElement;
  appRoutes?: AppRouteDefinition[];
  dev?: {
    resources?: ResourceProps[];
    routes?: ReactElement;
  };
  Provider?: ComponentType<PropsWithChildren>;
  AuthRuntimeProvider?: ComponentType<PropsWithChildren>;
  authRuntimePriority?: number;
  UserMenuItems?: ComponentType;
  authAdapters?: AuthenticatorAdapter[];
};
