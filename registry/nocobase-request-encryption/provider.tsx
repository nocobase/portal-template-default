import {
  useLayoutEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { nocobaseClient } from "@nocobase/portal-sdk/client";

import { requestEncryptionTransformer } from "./request-encoding";

export function RequestEncryptionProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const remove = nocobaseClient.addQueryTransformer(
      requestEncryptionTransformer
    );
    setReady(true);
    return remove;
  }, []);

  return ready ? children : null;
}
