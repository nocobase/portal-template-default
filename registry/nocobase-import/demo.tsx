import { useMemo } from "react";

import { ImportRecordsButton } from "./import-records-button";
import { useImportTranslation } from "./i18n";
import { createUserImportColumns } from "./users-import-config";
import { UsersImportDemo } from "./users-import-demo";

export default function ImportDemoPage() {
  const t = useImportTranslation();
  const columns = useMemo(() => createUserImportColumns(t), [t]);
  return (
    <UsersImportDemo
      badge={t("demo.badge", "Base import")}
      title={t("demo.title", "User import")}
      description={t(
        "demo.description",
        "Download a user template and import records through the standard NocoBase import plugin."
      )}
      requirement={t(
        "demo.requirement",
        "Requires @nocobase/plugin-action-import on the connected server."
      )}
      renderAction={(refresh) => (
        <ImportRecordsButton
          collectionName="users"
          template={{
            columns,
            title: t("demo.users", "Users"),
            guide: t("field.usernameDescription", "Use a unique username."),
          }}
          onImported={refresh}
        />
      )}
    />
  );
}
