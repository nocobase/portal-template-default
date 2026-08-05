import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactGrabAPI } from "react-grab";

import { formatReactGrabContexts } from "./react-grab-picker-content";

const PORTAL_PICKER_PLUGIN = "nocobase-portal-component-picker";

export default function ReactGrabPicker() {
  const apiRef = useRef<ReactGrabAPI | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let disposed = false;
    let currentApi: ReactGrabAPI | null = null;

    void Promise.all([
      import("react-grab/core"),
      import("react-grab/primitives"),
    ])
      .then(([{ init }, { getElementContext }]) => {
        if (disposed) return;

        currentApi = init({
          activationMode: "toggle",
          freezeReactUpdates: false,
          telemetry: false,
        });
        currentApi.setEnabled(true);
        currentApi.registerPlugin({
          name: PORTAL_PICKER_PLUGIN,
          theme: {
            toolbar: {
              enabled: false,
            },
          },
          hooks: {
            onStateChange(state) {
              setActive(state.isActive);
            },
            async transformCopyContent(_content, elements) {
              const contexts = await Promise.all(
                elements.map((element) => getElementContext(element))
              );
              return formatReactGrabContexts(contexts, window.location.href);
            },
            onCopySuccess() {
              currentApi?.deactivate();
            },
          },
        });

        apiRef.current = currentApi;
        setReady(true);
      })
      .catch((error) => {
        if (!disposed) {
          console.error("Unable to initialize the component picker", error);
        }
      });

    return () => {
      disposed = true;
      apiRef.current = null;
      currentApi?.dispose();
    };
  }, []);

  if (!ready) return null;

  const togglePicker = () => {
    const api = apiRef.current;
    if (!api) return;

    if (api.isActive()) {
      api.deactivate();
    } else {
      api.setEnabled(true);
      api.activate();
    }
    setActive(api.isActive());
  };

  const label = active ? "Exit component selection" : "Select a component";

  return (
    <div
      data-react-grab-ignore
      data-react-grab-ignore-events
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[2001] flex justify-center"
    >
      <Button
        data-react-grab-ignore
        data-react-grab-ignore-events
        type="button"
        size="icon-sm"
        variant={active ? "default" : "secondary"}
        className="pointer-events-auto h-7 w-12 rounded-b-none border border-b-0 shadow-lg"
        aria-label={label}
        aria-pressed={active}
        title={label}
        onClick={togglePicker}
      >
        <ChevronUp
          className={cn(
            "transition-transform duration-200",
            active && "rotate-180"
          )}
        />
      </Button>
    </div>
  );
}
