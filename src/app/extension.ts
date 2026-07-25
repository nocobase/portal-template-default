import type { ResourceProps } from "@refinedev/core";
import type { ComponentType, PropsWithChildren, ReactElement } from "react";
import type { AuthenticatorAdapter } from "@/components/auth/types";

export type AppExtension = {
  id: string;
  resources?: ResourceProps[];
  routes?: ReactElement;
  Provider?: ComponentType<PropsWithChildren>;
  AuthRuntimeProvider?: ComponentType<PropsWithChildren>;
  authRuntimePriority?: number;
  UserMenuItems?: ComponentType;
  authAdapters?: AuthenticatorAdapter[];
};
