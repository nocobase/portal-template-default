# NocoBase China region field

Provides Portal-native editing and display components for fields created by `@nocobase/plugin-field-china-region`.

```tsx
const [value, setValue] = useState<ChinaRegionValue>();

<ChinaRegionPicker value={value} onChange={setValue} maxLevel={3} />
<ChinaRegionDisplay value={value} />
```

`ChinaRegionPicker` lazily loads provinces, cities, and areas through `chinaRegions:list`. By default it returns the selected region records so the value can be submitted to a NocoBase `chinaRegion`/`belongsToMany` field. Set `labelInValue={false}` to return region codes instead. `maxLevel` supports the province, city, and area levels currently imported by the server plugin.

## Server dependency

Requires `@nocobase/plugin-field-china-region` to be installed and enabled. The plugin owns the `chinaRegions` dataset and allows authenticated users to list it. Portal does not bundle or duplicate the administrative division dataset.
