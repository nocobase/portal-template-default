import { useEffect, useState, type PropsWithChildren } from "react";

import { LoadingState } from "@/components/app-shell/loading-state";
import { setTranslationResolver } from "@/lib/i18n";
import { loadServerLocaleResources } from "./server-resources";
import { translate } from "./runtime";

export function LocalePreferenceProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => setTranslationResolver(translate), []);

  useEffect(() => {
    let active = true;
    void loadServerLocaleResources()
      .catch((error) => {
        console.warn("Unable to load NocoBase locale resources", error);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return <LoadingState className="min-h-80" />;
  }

  return children;
}
