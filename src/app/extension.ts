import type { ResourceProps } from "@refinedev/core";
import type { ComponentType, PropsWithChildren, ReactElement } from "react";

export type AppExtension = {
  id: string;
  resources?: ResourceProps[];
  routes?: ReactElement;
  Provider?: ComponentType<PropsWithChildren>;
};
