# NocoBase Collection Tree

Portal tree manager for collections created by `@nocobase/plugin-collection-tree`. Listing uses the plugin-specific `tree: true` option so nesting, filtered ancestor recovery, and root pagination are handled by the server repository. Create, move, rename, and delete continue to use standard collection actions; the plugin maintains its path table and rejects cyclic parent changes. The development demo targets the starter environment's `tree` collection and its `name` field at `/dev/collection-tree`; application pages should pass their own collection and title field.
