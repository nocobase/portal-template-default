# NocoBase map

Portable AMap and Google Maps rendering for NocoBase geometry values.

```tsx
<NocoBaseMap
  provider="amap"
  features={records.map((record) => ({
    id: record.id,
    label: record.name,
    geometry: { type: "point", coordinates: record.location },
    record,
  }))}
  onFeatureClick={(feature) => openDetails(feature.record)}
/>
```

Supported geometry types are `point`, `lineString`, `polygon`, and `circle`. Coordinates use the NocoBase `[longitude, latitude]` convention; circles add radius in meters as the third value. Pass `accessKey` directly for an application-owned credential or omit it to load the provider configuration from NocoBase.

A browser page can use multiple map instances, but every instance of the same provider must use the same credentials because both provider SDKs install a single global runtime.

## Server dependency

Using server-managed credentials and NocoBase map field types requires `@nocobase/plugin-map`. Configure AMap or Google Maps credentials in the NocoBase administration interface. The component does not include the plugin's administration page or UI Builder block designer.
