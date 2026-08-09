export type MarkdownEditorMode = "ir" | "sv" | "wysiwyg";
export type MarkdownUploadResult = { filename: string; url: string };
export type MarkdownVditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  mode?: MarkdownEditorMode;
  minHeight?: number;
  placeholder?: string;
  toolbar?: string[];
  fileCollection?: string;
  uploadFile?: (file: File, storage: VditorStorageInfo) => Promise<MarkdownUploadResult>;
};
export type VditorStorageInfo = { id: string | number; title?: string; name?: string; type?: string; rules?: unknown };
