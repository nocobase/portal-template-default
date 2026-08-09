import type {
  ImportProDuplicatesConfig,
  ImportProExecutionConfig,
  ImportProOptionsValue,
} from "./types";

export const DEFAULT_IMPORT_PRO_OPTIONS: ImportProOptionsValue = {
  mode: "auto",
  triggerWorkflow: false,
  identifyDuplicates: false,
  uniqueFields: [],
  duplicateMode: "skip",
  emptyValueOption: "ignore",
};

export function createImportProOptions(
  defaults?: Partial<ImportProOptionsValue>
): ImportProOptionsValue {
  return {
    ...DEFAULT_IMPORT_PRO_OPTIONS,
    ...defaults,
    uniqueFields: defaults?.uniqueFields ? [...defaults.uniqueFields] : [],
  };
}

export function createImportProOptionsFromConfig({
  defaultOptions,
  execution,
  duplicates,
}: {
  defaultOptions?: Partial<ImportProOptionsValue>;
  execution?: ImportProExecutionConfig;
  duplicates?: ImportProDuplicatesConfig;
}): ImportProOptionsValue {
  return createImportProOptions({
    ...defaultOptions,
    mode: execution?.mode ?? defaultOptions?.mode,
    triggerWorkflow:
      execution?.triggerWorkflow ?? defaultOptions?.triggerWorkflow,
    identifyDuplicates:
      duplicates?.enabled ?? defaultOptions?.identifyDuplicates,
    uniqueFields: duplicates?.fields ?? defaultOptions?.uniqueFields,
    duplicateMode: duplicates?.strategy ?? defaultOptions?.duplicateMode,
    emptyValueOption:
      duplicates?.emptyCell ?? defaultOptions?.emptyValueOption,
  });
}

export function appendImportProFormData(
  formData: FormData,
  options: ImportProOptionsValue
) {
  formData.append("triggerWorkflow", JSON.stringify(options.triggerWorkflow));
  if (!options.identifyDuplicates) return;

  formData.append(
    "duplicateOption",
    JSON.stringify({
      uniqueField: options.uniqueFields,
      mode: options.duplicateMode,
      ...(options.duplicateMode === "skip"
        ? {}
        : { emptyValueOption: options.emptyValueOption }),
    })
  );
}
