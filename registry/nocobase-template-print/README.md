# NocoBase Template Print

Reusable Portal API, hook, and button integrations for the server-side template-print plugin. Template creation and maintenance remain in the NocoBase administration interface; this Registry item only selects an applicable template, invokes the plugin protocol, and downloads the generated document.

The development showcase demonstrates four combinations: detail and list printing, each with either a preconfigured template or a template selected when the action is clicked. It also includes two fixed-template PDF examples covering list and detail printing.

The NocoBase server must enable `@nocobase/plugin-action-template-print`. The signed-in role also needs `printingTemplates:list` permission plus access to the target collection and its `templatePrint` action. Templates are matched by data source, collection, and whether they accept one record (`map`) or multiple records (`array`). Legacy templates without a data-source or root-data-type value are treated as `main` and `map`.

## Single record

```tsx
import { TemplatePrintButton } from "@/extensions/nocobase-template-print";

<TemplatePrintButton
  collectionName="orders"
  dataSourceKey="main"
  selection={{ type: "single", filterByTk: order.id }}
/>
```

Composite primary keys can be passed directly through `filterByTk`.

## Selected records

```tsx
<TemplatePrintButton
  collectionName="orders"
  dataSourceKey="reporting"
  selection={{
    type: "selected",
    recordKeys: selectedOrderIds,
    rowKey: "id",
  }}
  queryParams={{ appends: ["customer", "items"] }}
  convertedToPDF
/>
```

Use `selection={{ type: "all" }}` with the current list filter in `queryParams` to print the complete filtered result. The plugin limits one print operation to 300 records.

## Fixed template and headless use

Set `templateName` when the application configuration already chooses a template and no runtime menu is needed. For custom UI, use `usePrintingTemplates`, `useTemplatePrint`, or the lower-level `listPrintingTemplates` and `printTemplate` functions exported by this package.

When `templateName` is omitted, `TemplatePrintButton` loads templates when its menu opens. The list request is filtered on the server by data source, collection, and record shape (`map` or `array`); it does not download every printing template for client-side filtering.

The request uses a stable Portal-specific `uid` by default so it does not depend on a UI Schema position. Pass an existing configured action `uid` only when the installation intentionally reuses its button-level role restrictions.

Pass `messages` to localize the built-in button and menu labels. Pass `onError` to connect failures to the application's notification system.
