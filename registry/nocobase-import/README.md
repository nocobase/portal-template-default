# NocoBase Import

Portal-native XLSX import integration for `@nocobase/plugin-action-import`.

The Registry item owns the plugin-specific protocol: template download, multipart upload, response normalization, errors, and the import dialog. Business pages provide the data source, collection, and explicit import columns.

```tsx
import { ImportRecordsButton } from "@/extensions/nocobase-import";

<ImportRecordsButton
  collectionName="users"
  template={{
    title: "Users",
    guide: "Use a unique username.",
    columns: [
      { dataIndex: ["username"], defaultTitle: "Username" },
      { dataIndex: ["email"], defaultTitle: "Email" },
    ],
  }}
  onImported={refreshUsers}
/>
```

Requirements:

- Enable `@nocobase/plugin-action-import` on the connected NocoBase server.
- Grant the current role the collection's `importXlsx` action and intended writable fields.
- Configure columns explicitly. Displayed table columns are not used to infer writable import fields.

For async import, duplicate handling, and workflow options, install `@nocobase/import-pro` as an extension of this item.
