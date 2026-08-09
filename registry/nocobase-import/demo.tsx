import { lazy, Suspense, useMemo } from "react";

import { getImportProDemoActionLoader } from "./demo-contributions";
import { ImportRecordsButton } from "./import-records-button";
import { useImportTranslation } from "./i18n";
import { createUserImportColumns } from "./users-import-config";
import { UsersImportDemo } from "./users-import-demo";

const importProDemoActionLoader = getImportProDemoActionLoader();
const ImportProDemoAction = importProDemoActionLoader
  ? lazy(importProDemoActionLoader)
  : undefined;

export default function ImportDemoPage() {
  const t = useImportTranslation();
  const columns = useMemo(() => createUserImportColumns(t), [t]);
  return (
    <UsersImportDemo
      badge={t("demo.badge", "Import workflows")}
      title={t("demo.title", "User import")}
      description={t(
        "demo.description",
        "Download a user template and choose standard or Pro import options from one workspace."
      )}
      requirement={
        ImportProDemoAction
          ? t(
              "demo.requirementPro",
              "Standard import requires action-import; Pro options also require action-import-pro and async-task-manager."
            )
          : t(
              "demo.requirement",
              "Requires @nocobase/plugin-action-import on the connected server."
            )
      }
      renderAction={(refresh) => (
        <div className="flex flex-wrap items-center gap-2">
          <ImportRecordsButton
            collectionName="users"
            template={{
              columns,
              title: t("demo.users", "Users"),
              guide: t("field.usernameDescription", "Use a unique username."),
            }}
            onImported={refresh}
          />
          {ImportProDemoAction ? (
            <Suspense fallback={null}>
              <ImportProDemoAction onImported={refresh} />
            </Suspense>
          ) : null}
        </div>
      )}
    />
  );
}
