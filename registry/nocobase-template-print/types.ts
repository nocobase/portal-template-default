export type TemplateRootDataType = "map" | "array";

export type TemplatePrintRecordKey = string | number;

export type TemplatePrintSelection =
  | {
      type: "single";
      filterByTk: unknown;
    }
  | {
      type: "selected";
      recordKeys: TemplatePrintRecordKey[];
      rowKey?: string;
    }
  | {
      type: "all";
    };

export type PrintingTemplate = {
  name: string;
  title: string;
  collectionName: string;
  dataSource: string;
  rootDataType: TemplateRootDataType;
  filename?: string;
  legacy?: boolean;
};

export type TemplatePrintResult = {
  blob: Blob;
  filename: string;
};

export type ListPrintingTemplatesOptions = {
  collectionName: string;
  dataSourceKey?: string;
  rootDataType: TemplateRootDataType;
  signal?: AbortSignal;
};

export type PrintTemplateOptions = {
  collectionName: string;
  dataSourceKey?: string;
  templateName: string;
  selection: TemplatePrintSelection;
  queryParams?: Record<string, unknown>;
  convertedToPDF?: boolean;
  timezone?: string;
  uid?: string;
  signal?: AbortSignal;
};

export type TemplatePrintMessages = {
  print: string;
  selectTemplate: string;
  loadingTemplates: string;
  noTemplates: string;
  failedToLoadTemplates: string;
  printing: string;
  noSelectedRecords: string;
};
