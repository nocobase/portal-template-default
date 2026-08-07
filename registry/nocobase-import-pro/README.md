# NocoBase Import Pro

Pro extension for `@/extensions/nocobase-import`.

It reuses the base template download, XLSX upload, dialog, error handling, and synchronous result UI, then adds:

- automatic, synchronous, and asynchronous execution modes;
- workflow triggering;
- duplicate identification and skip/update/update-only strategies;
- empty-cell handling;
- current-task polling, progress, and cancellation.

```tsx
import { ImportProRecordsButton } from "@/extensions/nocobase-import-pro";

<ImportProRecordsButton
  collectionName="users"
  template={{
    title: "Users",
    guide: "Use a unique username.",
    columns: userImportColumns,
  }}
  execution={{
    mode: "auto",
    triggerWorkflow: false,
  }}
  duplicates={{
    enabled: true,
    strategy: "skip",
    fields: ["username"],
    emptyCell: "ignore",
    editableByUploader: true,
  }}
  onImported={refreshUsers}
/>
```

Requirements:

- `@nocobase/plugin-action-import`
- `@nocobase/plugin-action-import-pro`
- `@nocobase/plugin-async-task-manager`

Install the base `@nocobase/import` Registry item together with this extension.
