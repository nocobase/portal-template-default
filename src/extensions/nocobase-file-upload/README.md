# NocoBase File Upload

Controlled shadcn/ui file upload field for NocoBase file-template collections.

The field reads a `FileFieldDescriptor`, checks `storages:check`, uploads to the
descriptor's target file collection, stores the uploaded file record in React
Hook Form, and exposes `serializeFileFieldValue()` for association payloads.
`fileCollection` must come from the business relation field's `target` metadata
(for example, `users.avatar.target`), not from a hard-coded default table.

```tsx
import {
  FileUploadField,
  serializeFileFieldValue,
  type FileFieldDescriptor,
} from "@/extensions/nocobase-file-upload";

const avatarDescriptor: FileFieldDescriptor = {
  sourceCollection: "users",
  fieldName: "avatar",
  fileCollection: "files",
  relation: "belongsTo",
  accept: "image/*",
};
```

At page-generation time, read collection metadata with `collections:listMeta` or
`collections:get`, find `sourceCollection.fields[fieldName]`, and use:

```ts
const descriptor = {
  sourceCollection: collection.name,
  fieldName: field.name,
  fileCollection: field.target,
  relation: field.type,
};
```

The target collection should be a file-template collection.

For create and edit payloads, keep the full file record in the form state and
serialize before submitting. The submitted key is the relation field name from
the descriptor:

```ts
const payload = serializeFileFieldValues(values, [avatarDescriptor]);
// payload.avatar is { id } because avatarDescriptor.fieldName === "avatar"
```
