# NocoBase in-app messages

Portal-native in-app notification components backed by NocoBase's notification manager and in-app message plugins.

The Registry item is opt-in: installing it does not modify the application shell. Use the self-contained widget wherever the application owns the layout:

```tsx
import { InAppMessageWidget } from "@/extensions/nocobase-in-app-message";

export function Toolbar() {
  return <InAppMessageWidget />;
}
```

For applications that need multiple notification surfaces, mount `InAppMessageProvider` once and compose `NotificationHeaderAction` or `NotificationInboxSheet` below it.

The components use the current-user resources only:

- `myInAppMessages:count`
- `myInAppMessages:list`
- `myInAppChannels:list`
- `notificationInAppMessages:updateMyOwn`

The NocoBase application must enable `@nocobase/plugin-notification-manager` and `@nocobase/plugin-notification-in-app-message`. WebSocket events provide immediate updates; a 60-second unread-count query and window-focus refresh provide a fallback. A development-only showcase is available at `/dev/in-app-message`.
