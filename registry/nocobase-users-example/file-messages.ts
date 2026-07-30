import { type useTranslate } from "@refinedev/core";

import type {
  FilePreviewMessages,
  FileUploadMessages,
} from "@/extensions/nocobase-file-upload";

export type Translate = ReturnType<typeof useTranslate>;

export const getAvatarUploadMessages = (
  translate: Translate
): Partial<FileUploadMessages> => ({
  chooseFile: translate(
    "users.form.avatar.chooseFile",
    { ns: "app" },
    "Choose file"
  ),
  dragActive: translate(
    "users.form.avatar.dragActive",
    { ns: "app" },
    "Drop the avatar here"
  ),
  dragInactive: translate(
    "users.form.avatar.dragInactive",
    { ns: "app" },
    "Drag an image here, or choose from your device."
  ),
  checkingStorage: translate(
    "users.form.avatar.checkingStorage",
    { ns: "app" },
    "Checking upload settings"
  ),
  uploading: translate("users.form.avatar.uploading", { ns: "app" }, "Uploading"),
  uploaded: translate("users.form.avatar.uploaded", { ns: "app" }, "Uploaded"),
  failed: translate("users.form.avatar.failed", { ns: "app" }, "Failed"),
  cancelled: translate("users.form.avatar.cancelled", { ns: "app" }, "Cancelled"),
  retry: translate("users.form.avatar.retry", { ns: "app" }, "Retry"),
  remove: translate("users.form.avatar.remove", { ns: "app" }, "Remove"),
  cancel: translate("users.form.avatar.cancelUpload", { ns: "app" }, "Cancel"),
  storageUnsupported: translate(
    "users.form.avatar.storageUnsupported",
    { ns: "app" },
    "Avatar upload is unavailable because the target file collection is not configured."
  ),
  maxFilesReached: translate(
    "users.form.avatar.maxFilesReached",
    { ns: "app" },
    "Only one avatar can be uploaded."
  ),
  uploadDisabled: translate(
    "users.form.avatar.uploadDisabled",
    { ns: "app" },
    "Avatar upload is disabled."
  ),
  noFiles: translate("users.form.avatar.noFiles", { ns: "app" }, "No avatar"),
  fileSizeExceeded: (maxSize) =>
    translate(
      "users.form.avatar.fileSizeExceeded",
      { ns: "app", maxSize },
      `File size exceeds ${maxSize} bytes.`
    ),
  storageMimeTypeRejected: translate(
    "users.form.avatar.storageMimeTypeRejected",
    { ns: "app" },
    "This image type is not allowed by storage."
  ),
  fieldMimeTypeRejected: translate(
    "users.form.avatar.fieldMimeTypeRejected",
    { ns: "app" },
    "Please upload an image file."
  ),
  directUploadFailed: (status) =>
    translate(
      "users.form.avatar.directUploadFailed",
      { ns: "app", status },
      `Direct upload failed (${status}).`
    ),
});

export const getFilesUploadMessages = (
  translate: Translate
): Partial<FileUploadMessages> => ({
  chooseFiles: translate(
    "users.form.files.chooseFiles",
    { ns: "app" },
    "Choose files"
  ),
  dragActive: translate(
    "users.form.files.dragActive",
    { ns: "app" },
    "Drop files here"
  ),
  dragInactive: translate(
    "users.form.files.dragInactive",
    { ns: "app" },
    "Drag files here, or choose from your device."
  ),
  storageUnsupported: translate(
    "users.form.files.storageUnsupported",
    { ns: "app" },
    "File upload is unavailable because the target file collection is not configured."
  ),
  noFiles: translate("users.form.files.noFiles", { ns: "app" }, "No files"),
});

const getBasePreviewMessages = (
  translate: Translate
): Partial<FilePreviewMessages> => ({
  preview: translate("filePreview.preview", { ns: "app" }, "Preview"),
  download: translate("filePreview.download", { ns: "app" }, "Download"),
  previous: translate(
    "filePreview.previous",
    { ns: "app" },
    "Previous file"
  ),
  next: translate("filePreview.next", { ns: "app" }, "Next file"),
  close: translate("filePreview.close", { ns: "app" }, "Close"),
  unsupportedTitle: translate(
    "filePreview.unsupportedTitle",
    { ns: "app" },
    "Preview is not available"
  ),
  unsupportedDescription: translate(
    "filePreview.unsupportedDescription",
    { ns: "app" },
    "This file format is not supported for preview. Download the file to view it."
  ),
  imageAlt: (filename) =>
    translate(
      "filePreview.imageAlt",
      { ns: "app", filename },
      `Preview of ${filename}`
    ),
  pdfTitle: translate("filePreview.pdfTitle", { ns: "app" }, "PDF preview"),
  textTitle: translate("filePreview.textTitle", { ns: "app" }, "File preview"),
  audioTitle: translate("filePreview.audioTitle", { ns: "app" }, "Audio preview"),
  videoTitle: translate("filePreview.videoTitle", { ns: "app" }, "Video preview"),
  officeTitle: translate(
    "filePreview.officeTitle",
    { ns: "app" },
    "Office preview"
  ),
  officeLoading: translate(
    "filePreview.officeLoading",
    { ns: "app" },
    "Preparing Office preview..."
  ),
  officeError: translate(
    "filePreview.officeError",
    { ns: "app" },
    "Office preview is not available"
  ),
});

export const getAvatarPreviewMessages = (
  translate: Translate
): Partial<FilePreviewMessages> => ({
  ...getBasePreviewMessages(translate),
  noFiles: translate("users.form.avatar.noFiles", { ns: "app" }, "No avatar"),
});

export const getFilesPreviewMessages = (
  translate: Translate
): Partial<FilePreviewMessages> => ({
  ...getBasePreviewMessages(translate),
  noFiles: translate("users.form.files.noFiles", { ns: "app" }, "No files"),
});
