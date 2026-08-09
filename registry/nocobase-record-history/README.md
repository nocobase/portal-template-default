# NocoBase record history

Displays collection-wide or single-record history captured by `@nocobase/plugin-record-history`.

```tsx
<RecordHistoryTimeline
  dataSourceKey="main"
  collectionName="orders"
  recordId={order.id}
  fieldLabels={{ status: "Status", amount: "Amount" }}
/>
```

Omit `recordId` to show history for the whole collection. `renderSummary` and `renderValue` allow application-specific presentation without importing the plugin's UI Builder models.

## Server dependency

Requires the commercial `@nocobase/plugin-record-history`. The target collection and tracked fields must be configured in the NocoBase administration interface, and the current role needs permission to list record histories.

The component distinguishes a missing server plugin (404), insufficient permissions (403), an expired session (401), and a network failure in its error state.
