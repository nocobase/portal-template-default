import { useContext } from "react";

import { RouteSurfaceContext } from "./route-surface-context.js";

export function useRouteSurfaceClose() {
  const close = useContext(RouteSurfaceContext);

  if (!close) {
    throw new Error(
      "useRouteSurfaceClose must be used inside a RouteDrawer, RouteDialog, or RoutePage."
    );
  }

  return close;
}
