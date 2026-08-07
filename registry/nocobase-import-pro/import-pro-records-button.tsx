import { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ImportRecordsButton,
  type ImportRecordsExtension,
} from "@/extensions/nocobase-import";

import {
  appendImportProFormData,
  createImportProOptionsFromConfig,
} from "./import-pro-options";
import { ImportTaskProgress } from "./import-task-progress";
import { useImportProTranslation } from "./i18n";
import type {
  DuplicateMode,
  EmptyValueOption,
  ImportProOptionsValue,
  ImportProRecordsButtonProps,
} from "./types";

function ImportProOptions({
  value,
  onChange,
  uniqueFieldOptions,
  allowModeSelection,
  allowWorkflowTrigger,
  allowDuplicateHandling,
  duplicateOptionsEditable,
}: {
  value: ImportProOptionsValue;
  onChange: (value: ImportProOptionsValue) => void;
  uniqueFieldOptions: Array<{ value: string; label: string }>;
  allowModeSelection: boolean;
  allowWorkflowTrigger: boolean;
  allowDuplicateHandling: boolean;
  duplicateOptionsEditable: boolean;
}) {
  const t = useImportProTranslation();
  const patch = (next: Partial<ImportProOptionsValue>) =>
    onChange({ ...value, ...next });
  const showEmptyValueOption =
    value.identifyDuplicates && value.duplicateMode !== "skip";
  const selectedFieldLabels = value.uniqueFields
    .map(
      (field) =>
        uniqueFieldOptions.find((option) => option.value === field)?.label || field
    )
    .join(", ");
  const duplicateDescription = t(
    `options.${value.duplicateMode}Description`,
    value.duplicateMode === "skip"
      ? 'Check for existing records using the "Identifying Field". If a record exists, skip this entry; otherwise, import it as a new record.'
      : value.duplicateMode === "overwrite"
        ? 'Check for existing records using the "Identifying Field". If a record exists, update it; otherwise, import it as a new record.'
        : 'Check for existing records using the "Identifying Field". If a record exists, update it; otherwise, skip it.'
  );

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      {allowModeSelection ? (
        <div className="space-y-2">
          <Label>{t("options.execution", "Execution mode")}</Label>
          <Select
            value={value.mode}
            onValueChange={(mode) =>
              patch({ mode: mode as ImportProOptionsValue["mode"] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("options.auto", "Automatic")}</SelectItem>
              <SelectItem value="sync">{t("options.sync", "Synchronous")}</SelectItem>
              <SelectItem value="async">{t("options.async", "Asynchronous")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {allowWorkflowTrigger ? (
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="import-pro-trigger-workflow">
            {t("options.workflow", "Trigger workflows for imported records")}
          </Label>
          <Switch
            id="import-pro-trigger-workflow"
            checked={value.triggerWorkflow}
            onCheckedChange={(checked) => patch({ triggerWorkflow: checked })}
          />
        </div>
      ) : null}

      {allowDuplicateHandling ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="import-pro-identify-duplicates"
              checked={value.identifyDuplicates}
              disabled={!duplicateOptionsEditable}
              onCheckedChange={(checked) =>
                patch({ identifyDuplicates: checked === true })
              }
            />
            <Label htmlFor="import-pro-identify-duplicates">
              {t("options.duplicates", "Identify duplicate records")}
            </Label>
          </div>

          {value.identifyDuplicates ? (
            <div className="space-y-4 border-l-2 border-primary/20 pl-4">
              <div className="space-y-2">
                <Label>{t("options.handling", "Handling Options")}</Label>
                <Select
                  value={value.duplicateMode}
                  disabled={!duplicateOptionsEditable}
                  onValueChange={(duplicateMode) =>
                    patch({ duplicateMode: duplicateMode as DuplicateMode })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">
                      {t("options.skip", "Skip duplicates")}
                    </SelectItem>
                    <SelectItem value="overwrite">
                      {t("options.overwrite", "Update duplicates")}
                    </SelectItem>
                    <SelectItem value="update_only">
                      {t("options.updateOnly", "Update duplicates only")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  {duplicateDescription}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t("options.fields", "Identifying Field")}</Label>
                <Select
                  multiple
                  items={uniqueFieldOptions}
                  value={value.uniqueFields}
                  disabled={!duplicateOptionsEditable}
                  onValueChange={(uniqueFields) => patch({ uniqueFields })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={t("options.fieldsPlaceholder", "Please select")}
                    >
                      {() =>
                        selectedFieldLabels ||
                        t("options.fieldsPlaceholder", "Please select")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueFieldOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "options.fieldsHint",
                    "Select at least one imported root field."
                  )}
                </p>
              </div>

              {showEmptyValueOption ? (
                <div className="space-y-2">
                  <Label>
                    {t("options.emptyCells", "Empty cell handling Options")}
                  </Label>
                  <Select
                    value={value.emptyValueOption}
                    disabled={!duplicateOptionsEditable}
                    onValueChange={(emptyValueOption) =>
                      patch({ emptyValueOption: emptyValueOption as EmptyValueOption })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overwrite">
                        {t("options.clear", "Clear existing values")}
                      </SelectItem>
                      <SelectItem value="ignore">
                        {t("options.ignore", "Keep existing values")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {value.emptyValueOption === "overwrite"
                      ? t(
                          "options.clearDescription",
                          "When an imported cell is empty, set the corresponding field to empty."
                        )
                      : t(
                          "options.ignoreDescription",
                          "When an imported cell is empty, preserve the original field value."
                        )}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ImportProRecordsButton(props: ImportProRecordsButtonProps) {
  const resolvedTemplate = props.template
    ? props.template
    : {
        columns: props.columns,
        title: props.templateTitle,
        guide: props.explain,
      };
  const { execution, duplicates, defaultOptions } = props;
  const allowModeSelection = props.allowModeSelection ?? false;
  const allowWorkflowTrigger = props.allowWorkflowTrigger ?? false;
  const allowDuplicateHandling = props.allowDuplicateHandling ?? true;
  const t = useImportProTranslation();
  const configuredOptions = createImportProOptionsFromConfig({
    defaultOptions,
    execution,
    duplicates,
  });
  const [options, setOptions] = useState(() => configuredOptions);
  const showDuplicateHandling = duplicates ? true : allowDuplicateHandling;
  const duplicateOptionsEditable =
    duplicates?.editableByUploader ?? allowDuplicateHandling;
  const uniqueFieldOptions = useMemo(
    () =>
      resolvedTemplate.columns
        .filter((column) => column.dataIndex.length === 1)
        .map((column) => ({
          value: column.dataIndex[0],
          label: column.title || column.defaultTitle || column.dataIndex[0],
        })),
    [resolvedTemplate.columns]
  );

  const extension = useMemo<ImportRecordsExtension>(
    () => ({
      mode: options.mode,
      reviewTitle: t("options.title", "Import options"),
      reviewDescription: "",
      options: (
        <ImportProOptions
          value={options}
          onChange={setOptions}
          uniqueFieldOptions={uniqueFieldOptions}
          allowModeSelection={allowModeSelection}
          allowWorkflowTrigger={allowWorkflowTrigger}
          allowDuplicateHandling={showDuplicateHandling}
          duplicateOptionsEditable={duplicateOptionsEditable}
        />
      ),
      validate: () =>
        options.identifyDuplicates && options.uniqueFields.length === 0
          ? t(
              "validation.uniqueField",
              "Select at least one identifying field."
            )
          : undefined,
      appendFormData: (formData) => appendImportProFormData(formData, options),
      renderQueued: ({ taskId, onCompleted, onError }) => (
        <ImportTaskProgress
          taskId={taskId}
          onCompleted={onCompleted}
          onError={onError}
        />
      ),
      reset: () =>
        setOptions(
          createImportProOptionsFromConfig({
            defaultOptions,
            execution,
            duplicates,
          })
        ),
    }),
    [
      allowModeSelection,
      allowWorkflowTrigger,
      defaultOptions,
      duplicateOptionsEditable,
      duplicates,
      execution,
      options,
      showDuplicateHandling,
      t,
      uniqueFieldOptions,
    ]
  );

  return (
    <ImportRecordsButton
      collectionName={props.collectionName}
      dataSourceKey={props.dataSourceKey}
      template={resolvedTemplate}
      disabled={props.disabled}
      label={props.label || t("action.import", "Import Pro")}
      className={props.className}
      variant={props.variant}
      size={props.size}
      onImported={props.onImported}
      onQueued={props.onQueued}
      onError={props.onError}
      extension={extension}
    />
  );
}
