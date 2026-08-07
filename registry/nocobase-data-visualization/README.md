# NocoBase data visualization

Reusable Portal chart querying and rendering for `@nocobase/plugin-data-visualization`.

```tsx
<NocoBaseChart
  query={{
    collection: "orders",
    measures: [{ field: ["amount"], aggregation: "sum", alias: "total" }],
    dimensions: [{ field: ["createdAt"], format: "YYYY-MM", alias: "month" }],
  }}
  option={(rows) => ({
    xAxis: { type: "category", data: rows.map((row) => row.month) },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: rows.map((row) => row.total) }],
  })}
/>
```

The component deliberately separates the stable `charts:queryData` adapter from ECharts configuration. Applications can provide any ECharts option builder without importing the NocoBase UI Builder chart designer.

## Server dependency

Requires `@nocobase/plugin-data-visualization`. The server applies collection query permissions before executing the aggregate query.
