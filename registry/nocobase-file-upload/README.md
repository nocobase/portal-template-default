# NocoBase File Upload

Controlled shadcn/ui file upload and preview fields for NocoBase file-template
collections.

This registry item is generic. Do not hard-code `users.avatar`, `users.files`,
or the default `files` collection in generated pages. A page should only use the
component after it has confirmed that the business field is a relation to a
file-template collection.

## Descriptor

Read collection metadata with `collections:listMeta` or `collections:get`, find
the relation field on the business collection, and build the descriptor from the
field metadata:

```ts
import type { FileFieldDescriptor } from "@/extensions/nocobase-file-upload";

export const contractDocumentsDescriptor = {
  sourceCollection: "contracts",
  fieldName: "documents",
  fileCollection: "contractFiles",
  dataSourceKey: "main",
  relation: "belongsToMany",
  accept: ["application/pdf", ".docx", ".xlsx"],
} satisfies FileFieldDescriptor;
```

The important fields are:

- `sourceCollection`: the business collection that owns the relation field.
- `fieldName`: the relation field name on the business collection.
- `fileCollection`: the relation field's `target`; this must be a file-template collection.
- `relation`: the relation field's type. `belongsTo` and `hasOne` are single-file fields; `belongsToMany`, `hasMany`, and `belongsToArray` are multi-file fields.
- `dataSourceKey`: set this when the field belongs to a non-main data source.

## Editing

Keep the full uploaded file record in form state. Serialize file fields only
when submitting to NocoBase:

```tsx
import {
  FileUploadField,
  serializeFileFieldValues,
} from "@/extensions/nocobase-file-upload";

const fileDescriptors = [contractDocumentsDescriptor];

<FileUploadField
  descriptor={contractDocumentsDescriptor}
  value={field.value ?? []}
  onChange={field.onChange}
  messages={{
    chooseFiles: "Choose files",
    noFiles: "No files",
  }}
  previewMessages={{
    preview: "Preview",
    download: "Download",
  }}
/>;

const payload = serializeFileFieldValues(values, fileDescriptors);
// payload.documents is [{ id }, ...] because documents is belongsToMany.
```

Add file relation fields to `meta.appends` when loading records for edit pages,
so the form receives full file records instead of only relation ids:

```ts
import { getFileFieldAppends } from "@/extensions/nocobase-file-upload";

const meta = {
  appends: getFileFieldAppends(fileDescriptors),
};
```

## Preview

Readonly pages can render the same file value with `FilePreviewField`:

```tsx
import { FilePreviewField } from "@/extensions/nocobase-file-upload";

<FilePreviewField
  value={record?.documents ?? []}
  descriptor={contractDocumentsDescriptor}
  size={80}
  showFileName
  messages={{
    preview: "Preview",
    download: "Download",
    noFiles: "No files",
  }}
/>;
```

Preview support includes images, PDF through the browser, text/JSON, audio,
video, Office documents through Microsoft Office Online, and a download fallback
for unsupported or active-content files such as HTML, XML, and SVG. Private
Office files require `descriptor` so the component can request a temporary URL;
the temporary URL still has to be reachable by the Office Online service.
