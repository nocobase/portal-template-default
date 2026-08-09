import { AlertCircle, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

import { getChinaRegionErrorCode, listChinaRegions } from "./china-region-api";
import { useChinaRegionTranslation } from "./i18n";
import type {
  ChinaRegionLevel,
  ChinaRegionPickerProps,
  ChinaRegionRecord,
  ChinaRegionValue,
} from "./types";

function toError(reason: unknown) {
  return reason instanceof Error ? reason : new Error(String(reason));
}

function valueToPath(value: ChinaRegionValue | undefined): ChinaRegionRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item, index) => {
      if (typeof item === "string") {
        return [{ code: item, name: item, level: index + 1 }];
      }
      return item?.code ? [{ ...item, code: String(item.code) }] : [];
    })
    .sort((left, right) => left.level - right.level);
}

function serializePath(path: ChinaRegionRecord[]) {
  return path.map((item) => `${item.level}:${item.code}:${item.name}`).join("|");
}

export function ChinaRegionPicker({
  value,
  onChange,
  onBlur,
  onError,
  maxLevel = 3,
  labelInValue = true,
  changeOnSelect = false,
  disabled = false,
  required = false,
  invalid = false,
  className,
  id,
  ariaLabel,
  placeholders,
}: ChinaRegionPickerProps) {
  const t = useChinaRegionTranslation();
  const [path, setPath] = useState<ChinaRegionRecord[]>(() => valueToPath(value));
  const [options, setOptions] = useState<Partial<Record<ChinaRegionLevel, ChinaRegionRecord[]>>>({});
  const [loadingLevels, setLoadingLevels] = useState<Set<ChinaRegionLevel>>(new Set());
  const [error, setError] = useState<Error>();
  const valueRef = useRef(value);
  const onErrorRef = useRef(onError);
  valueRef.current = value;
  onErrorRef.current = onError;
  const serializedValue = serializePath(valueToPath(value));

  useEffect(() => {
    setPath(valueToPath(valueRef.current).slice(0, maxLevel));
  }, [maxLevel, serializedValue]);

  const parentCodes = [undefined, path[0]?.code, path[1]?.code] as const;
  const provinceCode = parentCodes[1];
  const cityCode = parentCodes[2];

  useEffect(() => {
    const controller = new AbortController();
    setLoadingLevels((current) => new Set(current).add(1));
    setError(undefined);
    listChinaRegions({ level: 1, signal: controller.signal })
      .then((regions) => {
        if (!controller.signal.aborted) setOptions((current) => ({ ...current, 1: regions }));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const nextError = toError(reason);
        setError(nextError);
        onErrorRef.current?.(nextError);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingLevels((current) => {
            const next = new Set(current);
            next.delete(1);
            return next;
          });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (maxLevel < 2 || !provinceCode) return;
    const controller = new AbortController();
    setLoadingLevels((current) => new Set(current).add(2));
    setError(undefined);
    listChinaRegions({ parentCode: provinceCode, signal: controller.signal })
      .then((regions) => {
        if (!controller.signal.aborted) setOptions((current) => ({ ...current, 2: regions }));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const nextError = toError(reason);
        setError(nextError);
        onErrorRef.current?.(nextError);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingLevels((current) => {
            const next = new Set(current);
            next.delete(2);
            return next;
          });
        }
      });
    return () => controller.abort();
  }, [maxLevel, provinceCode]);

  useEffect(() => {
    if (maxLevel < 3 || !cityCode) return;
    const controller = new AbortController();
    setLoadingLevels((current) => new Set(current).add(3));
    setError(undefined);
    listChinaRegions({ parentCode: cityCode, signal: controller.signal })
      .then((regions) => {
        if (!controller.signal.aborted) setOptions((current) => ({ ...current, 3: regions }));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const nextError = toError(reason);
        setError(nextError);
        onErrorRef.current?.(nextError);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingLevels((current) => {
            const next = new Set(current);
            next.delete(3);
            return next;
          });
        }
      });
    return () => controller.abort();
  }, [cityCode, maxLevel]);

  const emitValue = (nextPath: ChinaRegionRecord[], level: ChinaRegionLevel) => {
    if (!changeOnSelect && level < maxLevel) return;
    const nextValue: ChinaRegionValue = nextPath.length
      ? labelInValue
        ? nextPath
        : nextPath.map((region) => region.code)
      : null;
    onChange?.(nextValue, nextPath);
  };

  const selectRegion = (level: ChinaRegionLevel, code: string) => {
    const retainedPath = path.slice(0, level - 1);
    if (!code) {
      setPath(retainedPath);
      setOptions((current) => {
        const next = { ...current };
        if (level <= 1) delete next[2];
        if (level <= 2) delete next[3];
        return next;
      });
      onChange?.(retainedPath.length ? (labelInValue ? retainedPath : retainedPath.map((item) => item.code)) : null, retainedPath);
      return;
    }
    const selected = options[level]?.find((item) => item.code === code);
    if (!selected) return;
    const nextPath = [...retainedPath, selected];
    setPath(nextPath);
    setOptions((current) => {
      const next = { ...current };
      if (level <= 1) delete next[2];
      if (level <= 2) delete next[3];
      return next;
    });
    emitValue(nextPath, level);
  };

  const levelPlaceholders: Record<ChinaRegionLevel, string> = {
    1: placeholders?.[1] ?? t("placeholder.province", "Select province"),
    2: placeholders?.[2] ?? t("placeholder.city", "Select city"),
    3: placeholders?.[3] ?? t("placeholder.area", "Select area"),
  };
  const errorMessages = {
    pluginUnavailable: t(
      "error.pluginUnavailable",
      "China region data is unavailable. Install and enable @nocobase/plugin-field-china-region on the server."
    ),
    forbidden: t("error.forbidden", "You do not have permission to load China region data."),
    unauthorized: t("error.unauthorized", "Your session has expired. Please sign in again."),
    network: t("error.network", "Could not connect to the NocoBase server."),
    load: t("error.load", "Unable to load China region data."),
  };
  const visibleLevels = Array.from({ length: maxLevel }, (_, index) => (index + 1) as ChinaRegionLevel);

  return (
    <div className={cn("space-y-2", className)} onBlur={onBlur}>
      <div
        id={id}
        role="group"
        aria-label={ariaLabel ?? t("field.label", "China region")}
        aria-required={required}
        aria-invalid={invalid}
        className={cn("grid gap-2", maxLevel === 1 ? "grid-cols-1" : maxLevel === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}
      >
        {visibleLevels.map((level) => {
          const parentSelected = level === 1 || Boolean(path[level - 2]);
          const loading = loadingLevels.has(level);
          return (
            <div key={level} className="relative min-w-0">
              <NativeSelect
                className="w-full"
                value={path[level - 1]?.code ?? ""}
                disabled={disabled || !parentSelected || loading}
                required={required && level === maxLevel}
                aria-label={levelPlaceholders[level]}
                aria-invalid={invalid}
                onChange={(event) => selectRegion(level, event.target.value)}
              >
                <NativeSelectOption value="">{loading ? t("state.loading", "Loading...") : levelPlaceholders[level]}</NativeSelectOption>
                {(options[level] ?? []).map((region) => (
                  <NativeSelectOption key={region.code} value={region.code}>
                    {region.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {loading ? (
                <LoaderCircle className="pointer-events-none absolute top-1/2 right-8 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          );
        })}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{errorMessages[getChinaRegionErrorCode(error)]}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
