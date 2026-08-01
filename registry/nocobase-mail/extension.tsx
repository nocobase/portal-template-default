import type { AppExtension } from "@nocobase/portal-sdk/extensions";
import {
  ListFilter,
  Mail,
  MessagesSquare,
  PanelsLeftRight,
  PenLine,
  Users,
  UsersRound,
} from "lucide-react";
import { Outlet, Route } from "react-router";
import { MailUnreadProvider } from "./components";
import { MailBulkPage, MailComposePage, MailManagerPage } from "./mail-pages";
import {
  MailAudienceScenario,
  MailCorrespondenceScenario,
  MailScenarioOverview,
  MailUnreadScenario,
} from "./mail-demo-pages";

const nocobaseMailExtension: AppExtension = {
  id: "nocobase-mail",
  Provider: MailUnreadProvider,
  dev: {
    resources: [
      {
        name: "mail",
        list: "mail",
        meta: {
          label: "Mail",
          icon: <Mail />,
          description: "Read, send, and manage mailbox messages.",
        },
      },
      {
        name: "mail-scenario-workspace",
        list: "mail/workspace",
        meta: {
          parent: "mail",
          label: "My mailbox",
          icon: <PanelsLeftRight />,
        },
      },
      {
        name: "mail-scenario-audiences",
        list: "mail/personal",
        meta: {
          parent: "mail",
          label: "Mailbox views",
          icon: <Users />,
        },
      },
      {
        name: "mail-scenario-unread",
        list: "mail/unread",
        meta: {
          parent: "mail",
          label: "Unread indicator",
          icon: <MessagesSquare />,
        },
      },
      {
        name: "mail-scenario-compose",
        list: "mail/compose",
        meta: {
          parent: "mail",
          label: "Compose & send",
          icon: <PenLine />,
        },
      },
      {
        name: "mail-scenario-correspondence",
        list: "mail/filtered",
        meta: {
          parent: "mail",
          label: "Correspondence per user",
          icon: <ListFilter />,
        },
      },
      {
        name: "mail-bulk",
        list: "mail/bulk",
        meta: {
          parent: "mail",
          label: "Bulk mail",
          icon: <UsersRound />,
          description: "Send bulk mail and track delivery jobs.",
        },
      },
    ],
    routes: (
      <Route key="nocobase-mail" path="mail" element={<Outlet />}>
        <Route index element={<MailScenarioOverview />} />
        <Route path="workspace" element={<MailManagerPage />} />
        <Route path="personal" element={<MailAudienceScenario />} />
        <Route path="unread" element={<MailUnreadScenario />} />
        <Route path="compose" element={<MailComposePage />} />
        <Route path="filtered" element={<MailCorrespondenceScenario />} />
        <Route path="bulk" element={<MailBulkPage />} />
      </Route>
    ),
  },
};

export default nocobaseMailExtension;
