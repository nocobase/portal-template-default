import assert from "node:assert/strict";
import test from "node:test";

import { nocobaseClient } from "../dist/client/index.js";
import {
  clearSystemSettingsCache,
  loadSystemSettings,
} from "../dist/system-settings/index.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

test("a stale System Settings request cannot overwrite a forced refresh", async () => {
  const originalAction = nocobaseClient.action;
  const first = deferred();
  const second = deferred();
  const requests = [first, second];
  let requestCount = 0;

  nocobaseClient.action = () => requests[requestCount++].promise;
  clearSystemSettingsCache();

  try {
    const staleRequest = loadSystemSettings();
    const refreshRequest = loadSystemSettings(true);

    second.resolve({ appLang: "zh-CN" });
    assert.deepEqual(await refreshRequest, { appLang: "zh-CN" });

    first.resolve({ appLang: "en-US" });
    assert.deepEqual(await staleRequest, { appLang: "en-US" });

    assert.deepEqual(await loadSystemSettings(), { appLang: "zh-CN" });
    assert.equal(requestCount, 2);
  } finally {
    clearSystemSettingsCache();
    nocobaseClient.action = originalAction;
  }
});

test("clearing System Settings ignores an in-flight response", async () => {
  const originalAction = nocobaseClient.action;
  const first = deferred();
  const second = deferred();
  const requests = [first, second];
  let requestCount = 0;

  nocobaseClient.action = () => requests[requestCount++].promise;
  clearSystemSettingsCache();

  try {
    const staleRequest = loadSystemSettings();
    clearSystemSettingsCache();
    first.resolve({ appLang: "en-US" });
    await staleRequest;

    const nextRequest = loadSystemSettings();
    second.resolve({ appLang: "zh-CN" });
    assert.deepEqual(await nextRequest, { appLang: "zh-CN" });
    assert.equal(requestCount, 2);
  } finally {
    clearSystemSettingsCache();
    nocobaseClient.action = originalAction;
  }
});
