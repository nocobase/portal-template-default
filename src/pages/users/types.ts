import type {
  FileUploadFieldValue,
  SerializedFileFieldValue,
} from "@/extensions/nocobase-file-upload";
import type { Role } from "@/lib/nocobase/acl";

export type UserRecord = {
  id: string | number;
  nickname?: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: FileUploadFieldValue;
  roles?: Role[];
  createdAt?: string;
  updatedAt?: string;
};

export type UserFormValues = {
  nickname: string;
  username: string;
  email: string;
  phone: string;
  password?: string;
  avatar: FileUploadFieldValue;
};

export type UserSubmitValues = Omit<UserFormValues, "avatar"> & {
  avatar: SerializedFileFieldValue;
};

export type RoleRecord = Role & {
  id?: string | number;
  description?: string;
  default?: boolean;
  hidden?: boolean;
  allowConfigure?: boolean;
  strategy?: {
    actions?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
};
