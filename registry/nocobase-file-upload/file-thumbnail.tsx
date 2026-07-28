import {
  FileArchive,
  FileAudio,
  FileChartColumn,
  FileCode,
  FileIcon,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { getThumbnailUrl } from "./file-url";
import {
  getFileExtension,
  getFileMimeType,
  isActiveContentFile,
  isAudioFile,
  isImageFile,
  isPdfFile,
  isVideoFile,
} from "./file-preview-types";
import type { NocoBaseFileRecord } from "./types";

type FileThumbnailKind =
  | "archive"
  | "audio"
  | "code"
  | "default"
  | "document"
  | "image"
  | "json"
  | "pdf"
  | "presentation"
  | "spreadsheet"
  | "video";

export type FileThumbnailProps = {
  file?: NocoBaseFileRecord;
  rawFile?: File;
  alt?: string;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
  showExtensionBadge?: boolean;
};

const archiveExtensions = new Set([
  ".7z",
  ".bz2",
  ".gz",
  ".rar",
  ".tar",
  ".tgz",
  ".zip",
]);

const documentExtensions = new Set([
  ".doc",
  ".docx",
  ".md",
  ".odt",
  ".rtf",
  ".txt",
]);

const spreadsheetExtensions = new Set([".csv", ".ods", ".xls", ".xlsx"]);
const presentationExtensions = new Set([".odp", ".ppt", ".pptx"]);
const jsonExtensions = new Set([".json"]);
const codeExtensions = new Set([
  ".css",
  ".htm",
  ".html",
  ".js",
  ".jsx",
  ".svg",
  ".ts",
  ".tsx",
  ".xml",
  ".yml",
  ".yaml",
]);

const thumbnailStyles: Record<
  FileThumbnailKind,
  { Icon: LucideIcon; className: string; badgeClassName: string }
> = {
  archive: {
    Icon: FileArchive,
    className: "bg-amber-50 text-amber-700",
    badgeClassName: "bg-amber-600 text-white",
  },
  audio: {
    Icon: FileAudio,
    className: "bg-violet-50 text-violet-700",
    badgeClassName: "bg-violet-600 text-white",
  },
  code: {
    Icon: FileCode,
    className: "bg-slate-100 text-slate-700",
    badgeClassName: "bg-slate-700 text-white",
  },
  default: {
    Icon: FileIcon,
    className: "bg-muted/40 text-muted-foreground",
    badgeClassName: "bg-muted-foreground text-background",
  },
  document: {
    Icon: FileText,
    className: "bg-blue-50 text-blue-700",
    badgeClassName: "bg-blue-600 text-white",
  },
  image: {
    Icon: FileImage,
    className: "bg-sky-50 text-sky-700",
    badgeClassName: "bg-sky-600 text-white",
  },
  json: {
    Icon: FileJson,
    className: "bg-indigo-50 text-indigo-700",
    badgeClassName: "bg-indigo-600 text-white",
  },
  pdf: {
    Icon: FileText,
    className: "bg-red-50 text-red-700",
    badgeClassName: "bg-red-600 text-white",
  },
  presentation: {
    Icon: FileChartColumn,
    className: "bg-orange-50 text-orange-700",
    badgeClassName: "bg-orange-600 text-white",
  },
  spreadsheet: {
    Icon: FileSpreadsheet,
    className: "bg-emerald-50 text-emerald-700",
    badgeClassName: "bg-emerald-600 text-white",
  },
  video: {
    Icon: FileVideo,
    className: "bg-fuchsia-50 text-fuchsia-700",
    badgeClassName: "bg-fuchsia-600 text-white",
  },
};

function getNameExtension(value?: string) {
  if (!value) return "";
  const dotIndex = value.lastIndexOf(".");
  return dotIndex >= 0 ? value.slice(dotIndex).toLowerCase() : "";
}

function getRecordExtension(file?: NocoBaseFileRecord) {
  if (!file) return "";
  return file.extname
    ? file.extname.startsWith(".")
      ? file.extname.toLowerCase()
      : `.${file.extname.toLowerCase()}`
    : getNameExtension(file.title) || getNameExtension(file.filename);
}

function getRawFileExtension(file?: File) {
  return getNameExtension(file?.name);
}

function getExtensionLabel(extension: string) {
  const label = extension.replace(/^\./, "").toUpperCase();
  if (!label) return "";
  return label.length > 5 ? label.slice(0, 5) : label;
}

function getRawFileKind(file?: File): FileThumbnailKind {
  const mimetype = file?.type.toLowerCase() ?? "";
  const extension = getRawFileExtension(file);

  if (codeExtensions.has(extension)) return "code";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf" || extension === ".pdf") return "pdf";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype === "application/json" || jsonExtensions.has(extension)) return "json";
  if (mimetype.startsWith("text/") || documentExtensions.has(extension)) return "document";
  if (spreadsheetExtensions.has(extension)) return "spreadsheet";
  if (presentationExtensions.has(extension)) return "presentation";
  if (archiveExtensions.has(extension)) return "archive";
  return "default";
}

function getFileThumbnailKind(file: NocoBaseFileRecord): FileThumbnailKind {
  const extension = getRecordExtension(file) || getFileExtension(file);
  const mimetype = getFileMimeType(file);

  if (isActiveContentFile(file)) return "code";
  if (isImageFile(file)) return "image";
  if (isPdfFile(file)) return "pdf";
  if (isAudioFile(file)) return "audio";
  if (isVideoFile(file)) return "video";
  if (mimetype === "application/json" || jsonExtensions.has(extension)) return "json";
  if (spreadsheetExtensions.has(extension)) return "spreadsheet";
  if (presentationExtensions.has(extension)) return "presentation";
  if (archiveExtensions.has(extension)) return "archive";
  if (codeExtensions.has(extension)) return "code";
  if (mimetype.startsWith("text/") || documentExtensions.has(extension)) return "document";
  return "default";
}

export function FileThumbnail({
  file,
  rawFile,
  alt,
  className,
  iconClassName,
  imageClassName,
  showExtensionBadge = true,
}: FileThumbnailProps) {
  const thumbnailUrl = file ? getThumbnailUrl(file) : "";
  const showImage = Boolean(file && isImageFile(file) && thumbnailUrl);

  if (showImage) {
    return (
      <img
        src={thumbnailUrl}
        alt={alt ?? file?.title ?? file?.filename ?? ""}
        className={cn("h-full w-full object-cover", imageClassName)}
      />
    );
  }

  const kind = file ? getFileThumbnailKind(file) : getRawFileKind(rawFile);
  const extension = file ? getRecordExtension(file) : getRawFileExtension(rawFile);
  const extensionLabel = getExtensionLabel(extension);
  const style = thumbnailStyles[kind];
  const Icon = style.Icon;

  return (
    <span
      className={cn(
        "relative flex h-full w-full items-center justify-center rounded-md",
        style.className,
        className
      )}
    >
      <Icon className={cn("size-7", iconClassName)} />
      {showExtensionBadge && extensionLabel ? (
        <span
          className={cn(
            "absolute bottom-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-normal shadow-sm",
            style.badgeClassName
          )}
        >
          {extensionLabel}
        </span>
      ) : null}
    </span>
  );
}
