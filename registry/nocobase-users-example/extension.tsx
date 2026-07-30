import type { AppExtension } from "@/app/extension";
import { usersExampleRoutes } from "./app-routes";
import "./locales";

const usersExampleExtension: AppExtension = {
  id: "nocobase-users-example",
  priority: 0,
  appRoutes: usersExampleRoutes,
};

export default usersExampleExtension;
