import type { I18nProvider, ResourceProps } from "@refinedev/core";
import type { ComponentType, PropsWithChildren, ReactElement } from "react";

export type AppExtension = {
  id: string;
  resources?: ResourceProps[];
  routes?: ReactElement;
  Provider?: ComponentType<PropsWithChildren>;
  UserMenuItems?: ComponentType;
  i18nProvider?: I18nProvider;
};
