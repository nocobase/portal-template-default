import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  allowsMultipleFiles,
  toFileFieldValue,
  normalizeFileFieldValue,
} from "./form-value";
import { uploadDirect } from "./upload-direct";
import { uploadMultipart } from "./upload-multipart";
import { checkFileStorage } from "./use-file-storage";
import { validateFileBeforeUpload } from "./validation";
import type {
  FileFieldDescriptor,
  FileStorageInfo,
  FileUploadFieldValue,
  FileUploadItem,
  FileUploadMessages,
  NocoBaseFileRecord,
} from "./types";

export type UseFileUploadOptions = {
  descriptor: FileFieldDescriptor;
  value: FileUploadFieldValue;
  onChange: (value: FileUploadFieldValue) => void;
  disabled?: boolean;
  readOnly?: boolean;
  maxFiles?: number;
  messages: FileUploadMessages;
  onUploadStart?: (file: File) => void;
  onUploadComplete?: (record: NocoBaseFileRecord, file: File) => void;
  onUploadError?: (error: Error, file: File) => void;
};

let uploadKeySeed = 0;

const createUploadKey = () => {
  uploadKeySeed += 1;
  return `${Date.now()}-${uploadKeySeed}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const getFileKey = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}-${createUploadKey()}`;

function toError(value: unknown) {
  return value instanceof Error ? value : new Error(String(value));
}

async function uploadOne(
  file: File,
  descriptor: FileFieldDescriptor,
  storage: FileStorageInfo,
  signal: AbortSignal | undefined,
  messages: FileUploadMessages
) {
  const options = { file, descriptor, storage, signal };

  return storage.clientUpload
    ? uploadDirect(options, messages)
    : uploadMultipart(options);
}

export function useFileUpload({
  descriptor,
  value,
  onChange,
  disabled,
  readOnly,
  maxFiles,
  messages,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: UseFileUploadOptions) {
  const recordsRef = useRef(normalizeFileFieldValue(value));
  const controllersRef = useRef(new Map<string, AbortController>());
  const [storageError, setStorageError] = useState<Error | null>(null);
  const [items, setItems] = useState<FileUploadItem[]>(() =>
    recordsRef.current.map((record) => ({
      key: String(record.id),
      displayName: record.title || record.filename,
      status: "done",
      record,
    }))
  );
  const canUpload = !disabled && !readOnly;
  const multiple = allowsMultipleFiles(descriptor);

  useEffect(() => {
    const records = normalizeFileFieldValue(value);
    recordsRef.current = records;
    setItems((current) => {
      const active = current.filter(
        (item) => item.status === "uploading" || item.status === "error"
      );
      const activeKeys = new Set(active.map((item) => item.key));
      return [
        ...records
          .filter((record) => !activeKeys.has(String(record.id)))
          .map((record) => ({
            key: String(record.id),
            displayName: record.title || record.filename,
            status: "done" as const,
            record,
          })),
        ...active,
      ];
    });
  }, [value]);

  useEffect(
    () => () => {
      controllersRef.current.forEach((controller) => controller.abort());
      controllersRef.current.clear();
    },
    []
  );

  const limit = useMemo(() => {
    if (multiple) return maxFiles;
    return 1;
  }, [maxFiles, multiple]);

  const reachedLimit = limit !== undefined && recordsRef.current.length >= limit;

  const removeItem = useCallback(
    (key: string) => {
      const controller = controllersRef.current.get(key);
      if (controller) {
        controller.abort();
        controllersRef.current.delete(key);
      }

      setItems((current) => current.filter((item) => item.key !== key));
      const nextRecords = recordsRef.current.filter(
        (record) => String(record.id) !== key
      );
      recordsRef.current = nextRecords;
      onChange(toFileFieldValue(descriptor, nextRecords));
    },
    [descriptor, onChange]
  );

  const cancelItem = useCallback(
    (key: string) => {
      const controller = controllersRef.current.get(key);
      if (!controller) return;
      controller.abort();
      controllersRef.current.delete(key);
      setItems((current) =>
        current.map((item) =>
          item.key === key ? { ...item, status: "cancelled" } : item
        )
      );
    },
    []
  );

  const runUpload = useCallback(
    async (item: FileUploadItem) => {
      if (!item.rawFile) return;

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.key === item.key
            ? { ...currentItem, status: "checking", error: undefined }
            : currentItem
        )
      );

      let storage: FileStorageInfo;
      try {
        setStorageError(null);
        const storageResult = await checkFileStorage(descriptor);
        if (!storageResult?.isSupportToUploadFiles || !storageResult.storage) {
          throw new Error(messages.storageUnsupported);
        }
        storage = storageResult.storage;
      } catch (caught) {
        const error = toError(caught);
        setStorageError(error);
        setItems((current) =>
          current.map((currentItem) =>
            currentItem.key === item.key
              ? { ...currentItem, status: "error", error }
              : currentItem
          )
        );
        onUploadError?.(error, item.rawFile);
        return;
      }

      const validation = validateFileBeforeUpload(
        item.rawFile,
        descriptor,
        storage,
        messages
      );
      if (!validation.valid) {
        const error = new Error(validation.message);
        setItems((current) =>
          current.map((currentItem) =>
            currentItem.key === item.key
              ? { ...currentItem, status: "error", error }
              : currentItem
          )
        );
        onUploadError?.(error, item.rawFile);
        return;
      }

      const controller = new AbortController();
      controllersRef.current.set(item.key, controller);
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.key === item.key
            ? { ...currentItem, status: "uploading", error: undefined }
            : currentItem
        )
      );
      onUploadStart?.(item.rawFile);

      try {
        const record = await uploadOne(
          item.rawFile,
          descriptor,
          storage,
          controller.signal,
          messages
        );
        controllersRef.current.delete(item.key);
        recordsRef.current = multiple
          ? [...recordsRef.current, record]
          : [record];
        onChange(toFileFieldValue(descriptor, recordsRef.current));
        setItems((current) =>
          current.map((currentItem) =>
            currentItem.key === item.key
              ? {
                  ...currentItem,
                  key: String(record.id),
                  status: "done",
                  record,
                  displayName: record.title || record.filename,
                  rawFile: undefined,
                }
              : currentItem
          )
        );
        onUploadComplete?.(record, item.rawFile);
      } catch (caught) {
        controllersRef.current.delete(item.key);
        const error = toError(caught);
        const status = controller.signal.aborted ? "cancelled" : "error";
        setItems((current) =>
          current.map((currentItem) =>
            currentItem.key === item.key
              ? { ...currentItem, status, error }
              : currentItem
          )
        );
        if (!controller.signal.aborted) {
          onUploadError?.(error, item.rawFile);
        }
      }
    },
    [
      descriptor,
      messages,
      multiple,
      onChange,
      onUploadComplete,
      onUploadError,
      onUploadStart,
    ]
  );

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!canUpload) return;

      const selected = Array.from(fileList);
      const available =
        limit === undefined
          ? selected.length
          : Math.max(0, limit - recordsRef.current.length);
      const accepted = selected.slice(0, available);

      for (const file of accepted) {
        const item: FileUploadItem = {
          key: getFileKey(file),
          rawFile: file,
          displayName: file.name,
          showStatus: true,
          status: "pending",
        };
        setItems((current) =>
          multiple
            ? [...current, item]
            : current.filter((entry) => entry.status !== "done").concat(item)
        );
        await runUpload(item);
      }
    },
    [canUpload, limit, multiple, runUpload]
  );

  const retryItem = useCallback(
    async (key: string) => {
      if (!canUpload) return;
      const item = items.find((current) => current.key === key);
      if (!item?.rawFile) return;
      await runUpload(item);
    },
    [canUpload, items, runUpload]
  );

  return {
    items,
    addFiles,
    removeItem,
    cancelItem,
    retryItem,
    storageError,
    canUpload,
    multiple,
    reachedLimit,
  };
}
