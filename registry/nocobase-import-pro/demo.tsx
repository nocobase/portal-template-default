import { useMemo } from "react";

import type { ImportProDemoActionProps } from "@/extensions/nocobase-import";

import { useImportTranslation } from "@/extensions/nocobase-import";
import { createUserImportColumns } from "@/extensions/nocobase-import/users-import-config";
import { UsersImportDemo } from "@/extensions/nocobase-import/users-import-demo";

import { ImportProRecordsButton } from "./import-pro-records-button";
import { useImportProTranslation } from "./i18n";

export function ImportProDemoAction({ onImported }: ImportProDemoActionProps) {
  const importT = useImportTranslation();
  const columns = useMemo(() => createUserImportColumns(importT), [importT]);

  return (
    <ImportProRecordsButton
      collectionName="users"
      template={{
        columns,
        title: importT("demo.users", "Users"),
        guide: importT("field.usernameDescription", "Use a unique username."),
      }}
      execution={{ mode: "auto", triggerWorkflow: false }}
      duplicates={{
        enabled: false,
        fields: ["username"],
        strategy: "skip",
        emptyCell: "ignore",
        editableByUploader: true,
      }}
      onImported={onImported}
    />
  );
}

export default function ImportProDemoPage() {
  const t = useImportProTranslation();
  return (
    <UsersImportDemo
      badge={t("demo.badge", "Import Pro")}
      title={t("demo.title", "User import Pro")}
      description={t(
        "demo.description",
        "Import users with async execution, duplicate handling, and optional workflow triggers."
      )}
      requirement={t(
        "demo.requirement",
        "Requires action-import, action-import-pro, and async-task-manager on the connected server."
      )}
      renderAction={(refresh) => (
        <ImportProDemoAction onImported={refresh} />
      )}
    />
  );
}
