import { useEffect } from "react";
import type { ReactGrabAPI } from "react-grab";

export default function ReactGrabPicker() {
  useEffect(() => {
    let disposed = false;
    let currentApi: ReactGrabAPI | null = null;

    void import("react-grab/core")
      .then(({ init }) => {
        if (disposed) return;

        currentApi = init({
          telemetry: false,
        });
      })
      .catch((error) => {
        if (!disposed) {
          console.error("Unable to initialize the component picker", error);
        }
      });

    return () => {
      disposed = true;
      currentApi?.dispose();
    };
  }, []);

  return null;
}
