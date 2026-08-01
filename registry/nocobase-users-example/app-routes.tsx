import { UsersRound } from "lucide-react";

import { defineAppRoutes } from "@nocobase/portal-sdk/routing";
import { AccessDenied } from "@/components/access-control/access-denied";
import { CanAccess } from "@/components/access-control/can-access";
import { UserCreate } from "./create";
import { UserEdit } from "./edit";
import { UserList } from "./list";
import { RoleDetailRoute } from "./role-detail";
import { userRoutes } from "./routes";
import { UserShow } from "./show";

export const usersExampleRoutes = defineAppRoutes([
  {
    name: "users",
    path: userRoutes.list,
    element: (
      <CanAccess resource="users" action="list" fallback={<AccessDenied />}>
        <UserList />
      </CanAccess>
    ),
    resource: {
      meta: {
        label: "Users",
        priority: 1,
        singularLabel: "User",
        i18nKey: "resources.users",
        i18nSingularKey: "resources.user",
        i18nOptions: { ns: "app" },
        descriptionI18nKey: "resources.users.description",
        icon: <UsersRound />,
        description:
          "Manage the people who can sign in and work in this NocoBase application.",
        canCreate: true,
        canDelete: true,
        acl: { type: "collection" },
      },
    },
    children: [
      {
        name: "users.create",
        path: "create",
        resourceAction: "create",
        element: (
          <CanAccess
            resource="users"
            action="create"
            fallback={<AccessDenied />}
          >
            <UserCreate />
          </CanAccess>
        ),
      },
      {
        name: "users.edit",
        path: "edit/:id",
        resourceAction: "edit",
        element: (
          <CanAccess
            resource="users"
            action="edit"
            fallback={<AccessDenied />}
          >
            <UserEdit />
          </CanAccess>
        ),
      },
      {
        name: "users.role",
        path: "roles/:roleName",
        element: (
          <CanAccess
            resource="roles"
            action="show"
            fallback={<AccessDenied />}
          >
            <RoleDetailRoute returnTo="list" />
          </CanAccess>
        ),
      },
      {
        name: "users.show",
        path: "show/:id",
        resourceAction: "show",
        element: (
          <CanAccess
            resource="users"
            action="show"
            fallback={<AccessDenied />}
          >
            <UserShow />
          </CanAccess>
        ),
        children: [
          {
            name: "users.show.edit",
            path: "edit",
            element: (
              <CanAccess
                resource="users"
                action="edit"
                fallback={<AccessDenied />}
              >
                <UserEdit returnTo="show" />
              </CanAccess>
            ),
          },
          {
            name: "users.show.role",
            path: "roles/:roleName",
            element: (
              <CanAccess
                resource="roles"
                action="show"
                fallback={<AccessDenied />}
              >
                <RoleDetailRoute returnTo="show" />
              </CanAccess>
            ),
          },
        ],
      },
    ],
  },
]);
