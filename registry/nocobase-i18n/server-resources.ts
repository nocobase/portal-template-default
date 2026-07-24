import { nocobaseClient } from "@/lib/nocobase/client";
import {
  getLocaleDefinitions,
  registerLocale,
  setEnabledLocales,
} from "./locale-store";
import { applyDocumentLocale, getCurrentLocale, i18n } from "./runtime";

type ServerLanguagePayload = {
  lang?: string;
  resources?: Record<string, Record<string, string>>;
};

type SystemSettingsPayload = {
  enabledLanguages?: string[];
};

const serverResourceNamespaces = new Set(["lm-collections"]);
const loadedServerResourceNamespaces = new Set<string>();
const namespaceLoadPromises = new Map<string, Promise<void>>();
let cachedServerResources: ServerLanguagePayload["resources"] = {};
let serverResourcesPromise: Promise<void> | undefined;
let bootstrapStarted = false;
let bootstrapComplete = false;

function mergeNamespace(namespace: string, locale?: string) {
  const resource = cachedServerResources?.[namespace];
  if (!locale || !resource) return false;
  i18n.addResourceBundle(locale, namespace, resource, true, false);
  loadedServerResourceNamespaces.add(namespace);
  return true;
}

async function requestServerResources(
  namespaces: string[],
  requestedLocale?: string
) {
  const payload = await nocobaseClient.action<ServerLanguagePayload>(
    "app",
    "getLang",
    {
      method: "GET",
      query: {
        ...(requestedLocale ? { locale: requestedLocale } : {}),
        ...(namespaces.length ? { ns: namespaces.join(",") } : {}),
      },
      includeRole: false,
      withAclMeta: false,
    }
  );

  cachedServerResources = {
    ...cachedServerResources,
    ...payload.resources,
  };
  for (const namespace of namespaces) {
    mergeNamespace(namespace, payload.lang);
    loadedServerResourceNamespaces.add(namespace);
  }

  return payload;
}

async function ensureServerResourceNamespaces(namespaces: string[]) {
  const pending: Promise<void>[] = [];
  const missing: string[] = [];

  for (const namespace of namespaces) {
    if (loadedServerResourceNamespaces.has(namespace)) continue;
    if (mergeNamespace(namespace, getCurrentLocale())) continue;
    const existing = namespaceLoadPromises.get(namespace);
    if (existing) pending.push(existing);
    else missing.push(namespace);
  }

  if (missing.length) {
    const request = requestServerResources(
      missing,
      nocobaseClient.getStoredLocale() ?? getCurrentLocale()
    ).then(() => undefined);
    for (const namespace of missing) {
      namespaceLoadPromises.set(namespace, request);
    }
    const cleanup = () => {
      for (const namespace of missing) {
        if (namespaceLoadPromises.get(namespace) === request) {
          namespaceLoadPromises.delete(namespace);
        }
      }
    };
    void request.then(cleanup, cleanup);
    pending.push(request);
  }

  await Promise.all(pending);
}

export function registerServerResourceNamespace(namespace: string) {
  if (!namespace) return;
  serverResourceNamespaces.add(namespace);

  if (
    mergeNamespace(namespace, getCurrentLocale()) ||
    !bootstrapStarted ||
    !bootstrapComplete
  ) {
    return;
  }

  void ensureServerResourceNamespaces([namespace]).catch((error) => {
    console.warn(
      `Unable to load NocoBase locale namespace ${namespace}`,
      error
    );
  });
}

export function getServerResourceNamespaces() {
  return [...serverResourceNamespaces];
}

export function loadServerLocaleResources() {
  if (serverResourcesPromise) return serverResourcesPromise;

  bootstrapStarted = true;
  const requestedLocale = nocobaseClient.getStoredLocale();
  const initialNamespaces = [...serverResourceNamespaces];
  const systemSettingsPromise = nocobaseClient
    .action<SystemSettingsPayload>("systemSettings", "get", {
      method: "GET",
      includeRole: false,
      withAclMeta: false,
    })
    .catch((error) => {
      console.warn("Unable to load enabled NocoBase languages", error);
      return undefined;
    })
    .then((systemSettings) => {
      const configuredLocales = Array.isArray(systemSettings?.enabledLanguages)
        ? systemSettings.enabledLanguages
        : [];
      if (configuredLocales.length) setEnabledLocales(configuredLocales);
      return systemSettings;
    });
  const languagePromise = requestServerResources(
    initialNamespaces,
    requestedLocale
  );

  serverResourcesPromise = Promise.all([systemSettingsPromise, languagePromise])
    .then(async ([systemSettings, payload]) => {
      const configuredLocales = systemSettings?.enabledLanguages ?? [];
      const serverLocale = payload.lang;

      if (!configuredLocales.length && serverLocale) {
        setEnabledLocales([serverLocale]);
      }

      if (serverLocale) {
        registerLocale({ locale: serverLocale, label: serverLocale });
        nocobaseClient.setLocale(serverLocale);
        await i18n.changeLanguage(serverLocale);
        applyDocumentLocale(serverLocale);
      }

      bootstrapComplete = true;
      const lateNamespaces = [...serverResourceNamespaces].filter(
        (namespace) => !loadedServerResourceNamespaces.has(namespace)
      );
      if (lateNamespaces.length) {
        await ensureServerResourceNamespaces(lateNamespaces);
      }
    })
    .catch((error) => {
      bootstrapComplete = true;
      if (!getLocaleDefinitions().length) {
        setEnabledLocales([getCurrentLocale()]);
      }
      serverResourcesPromise = undefined;
      throw error;
    });

  return serverResourcesPromise;
}
