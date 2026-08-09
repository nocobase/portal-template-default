import type { ImportColumn } from "./types";

type Translate = (key: string, fallback: string) => string;

export function createUserImportColumns(t: Translate): ImportColumn[] {
  return [
    {
      dataIndex: ["nickname"],
      defaultTitle: "Nickname",
      title: t("field.nickname", "Nickname"),
    },
    {
      dataIndex: ["username"],
      defaultTitle: "Username",
      title: t("field.username", "Username"),
      description: t("field.usernameDescription", "Use a unique username."),
    },
    {
      dataIndex: ["email"],
      defaultTitle: "Email",
      title: t("field.email", "Email"),
    },
    {
      dataIndex: ["phone"],
      defaultTitle: "Phone",
      title: t("field.phone", "Phone"),
    },
  ];
}
