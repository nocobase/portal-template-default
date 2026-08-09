import { NotificationHeaderAction } from "./header-action";
import { InAppMessageProvider } from "./provider";

export function InAppMessageWidget() {
  return (
    <InAppMessageProvider>
      <NotificationHeaderAction />
    </InAppMessageProvider>
  );
}
