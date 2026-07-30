import type { FileFieldDescriptor } from "@/extensions/nocobase-file-upload";

const USER_AVATAR_FIELD_NAME = "avatar" as const;
const USER_FILES_FIELD_NAME = "files" as const;

export const userAvatarDescriptor = {
  sourceCollection: "users",
  fieldName: USER_AVATAR_FIELD_NAME,
  fileCollection: "files",
  dataSourceKey: "main",
  relation: "belongsTo",
  accept: "image/*",
} satisfies FileFieldDescriptor;

export const userFilesDescriptor = {
  sourceCollection: "users",
  fieldName: USER_FILES_FIELD_NAME,
  fileCollection: "files",
  dataSourceKey: "main",
  relation: "belongsToMany",
} satisfies FileFieldDescriptor;

export const userFileDescriptors = [
  userAvatarDescriptor,
  userFilesDescriptor,
] satisfies FileFieldDescriptor[];
