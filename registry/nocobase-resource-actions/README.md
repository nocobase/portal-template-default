# NocoBase Resource Actions

Reusable Portal components corresponding to the interaction capabilities of:

- `@nocobase/plugin-action-bulk-edit`
- `@nocobase/plugin-action-bulk-update`
- `@nocobase/plugin-action-duplicate`

These NocoBase plugins register UI Builder actions but do not add dedicated server APIs. The Portal components use the core collection `get`, `create`, and `update` actions, so the three plugins do not need to be enabled on the connected server. Collection ACL and field permissions remain authoritative.

## Bulk edit

The user chooses at runtime whether each configured field remains unchanged, receives a new value, or is cleared.

```tsx
<BulkEditRecordsButton
  collectionName="users"
  target={{ type: "selected", keys: selectedUserIds }}
  fields={[
    { name: "nickname", label: "Nickname", input: "text" },
    { name: "phone", label: "Phone", input: "tel" },
  ]}
  onUpdated={refreshUsers}
/>
```

## Bulk update

The assigned values are configured on the component and applied after optional confirmation.

```tsx
<BulkUpdateRecordsButton
  collectionName="users"
  target={{ type: "filter", filter: currentNocoBaseFilter }}
  values={{ status: "active" }}
  onUpdated={refreshUsers}
/>
```

Use `{ type: "all" }` only for an intentional whole-collection update; it sends `forceUpdate: true`. An empty filter is rejected instead of being treated as a whole-collection update.

## Duplicate

Direct mode creates the duplicate immediately. Edit mode fetches template data and opens a form using the configured fields before creation.

```tsx
<DuplicateRecordButton
  collectionName="users"
  recordKey={user.id}
  mode="edit"
  fields={[
    { name: "nickname", label: "Nickname", input: "text" },
    { name: "username", label: "Username", input: "text", required: true },
  ]}
  onDuplicated={refreshUsers}
/>
```

Nested field paths are supported. Use `renderInput` for field interfaces not covered by the built-in text, number, textarea, select, and checkbox inputs.
