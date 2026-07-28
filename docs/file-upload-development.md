---
title: "基于 shadcn/ui 的 NocoBase 文件上传组件开发指南"
description: "介绍怎么在 Portal Starter 中开发基于 shadcn/ui、React Hook Form 和 NocoBase 文件 collection 的第一阶段文件上传组件。"
keywords: "NocoBase,shadcn/ui,文件上传,Storage,React Hook Form,Registry"
---

# 基于 shadcn/ui 的 NocoBase 文件上传组件开发指南

在基于 Refine 和 shadcn/ui 的 Portal 应用中，**文件上传组件（File Upload）** 负责选择文件、执行上传，并把 NocoBase 文件记录写入业务表单。

第一阶段只解决一个问题：让页面可以把文件上传到字段指向的自定义文件 collection。上传组件不依赖固定表名，也不需要引入 `@nocobase/client-v2`。Storage 查询、文件检查和上传请求统一放在 `useFileUpload()` 中。

## 第一阶段做到什么

第一阶段包含这些能力：

- 点击选择或拖拽文件
- 根据字段和 Storage 规则检查文件大小及 MIME type
- 根据服务端返回的 `clientUpload` 选择 multipart 或客户端直传
- 上传到字段指向的自定义文件 collection
- 将完整的文件记录写入 React Hook Form
- 提交业务记录前将文件记录转换成 association 引用
- 支持默认 Storage 和 collection 绑定的自定义 Storage
- 支持通过 `X-Data-Source` 访问非 `main` 数据源
- 以单个 Registry item 提供组件、Hook 和上传函数

下面这些能力留到后续阶段：

- 上传百分比和进度条
- 文件预览、下载和私有文件临时访问地址
- 多文件并发调度
- 表单级上传任务统计和提交按钮联动
- 自动清理没有建立业务关联的文件

:::warning 注意

第一阶段不会自动阻止业务表单在上传过程中提交。此时提交值只包含已经上传完成的文件记录。页面如果需要严格保证文件完成后才能提交，应在后续接入表单级上传任务状态。

:::

## 最终效果

完成后，一个文件字段可以：

- 从字段描述中读取目标文件 collection 和数据源
- 从 `storages:check` 获取 Storage 规则和上传方式
- 顺序上传用户选择的一个或多个文件
- 在表单中保存上传成功的 `NocoBaseFileRecord`
- 在业务表单提交时保存文件 association

<!-- 需要一张 Portal 表单中文件上传字段完成上传后的截图 -->

默认流程如下：

```text
AI 读取建模信息并生成字段描述
                ↓
FileUploadField 接收受控值
                ↓
useFileUpload 请求 storages:check
                ↓
检查文件大小和 MIME type
                ↓
读取 storage.clientUpload
       ┌────────┴────────┐
       ↓                 ↓
multipart 上传      客户端直传
       └────────┬────────┘
                ↓
获得 NocoBaseFileRecord
                ↓
写入 React Hook Form
                ↓
提交时转换为 association 引用
```

## 建模约定

每个文件字段都必须指向一张由用户提前创建、使用 `file` template 的 NocoBase collection。文件 collection 的名称由业务建模决定，同一个应用里可以同时存在 `contractFiles`、`invoiceFiles`、`projectFiles` 等多张文件表。

Storage 只和目标文件 collection 绑定。业务字段不能覆盖 Storage 配置。运行时根据数据源和目标文件 collection 找到 Storage，不接收页面传入的 Storage 名称。

:::tip 页面生成阶段

页面由 AI 生成时，可以通过建模工具提前读取 collection 和字段元数据。运行时不需要再次加载完整的 `collections:listMeta`，只需要调用 `storages:check` 获取公开的 Storage 信息。

:::

字段描述保留生成页面所需的最小信息：

```ts
export type FileRelationType =
  | "belongsTo"
  | "hasOne"
  | "belongsToMany"
  | "hasMany"
  | "belongsToArray";

export type FileFieldDescriptor = {
  // 来源业务 collection 和字段。
  sourceCollection: string;
  fieldName: string;

  // 字段指向的 file template collection。
  fileCollection: string;
  dataSourceKey?: string;

  relation: FileRelationType;
  multiple: boolean;

  // 字段规则可以比 Storage 规则更严格。
  accept?: string | string[];
  maxSize?: number;
};
```

比如合同附件字段可以生成下面的描述：

```ts
export const contractDocuments: FileFieldDescriptor = {
  sourceCollection: "contracts",
  fieldName: "documents",
  fileCollection: "contractFiles",
  dataSourceKey: "main",
  relation: "belongsToMany",
  multiple: true,
  accept: ["application/pdf", "image/*"],
};
```

`fileCollection` 必须来自业务字段的 `target`。如果字段没有目标 collection，或者目标 collection 不是 `file` template，那么 AI 应停止生成上传字段并提示先完成建模。

## 组件怎么分层

第一阶段拆成两层就够了：

```text
FileUploadField
  shadcn/ui、拖拽区、文件列表和错误反馈
                    │
                    ▼
useFileUpload
  Storage 查询、文件检查、上传方式选择和任务状态
```

其中：

1. **`FileUploadField`** —— 处理展示和交互，通过 Hook 发起上传
2. **`useFileUpload`** —— 查询 Storage，并在内部调用 multipart 或客户端直传函数

`uploadMultipart()` 和 `uploadDirect()` 是普通异步函数，不是额外的 React Hook。`useFileUpload()` 可以在运行时根据 `storage.clientUpload` 选择它们，不会遇到条件调用 Hook 的问题。

不要在 `FileUploadField` 中直接调用 `fetch()` 或拼接 `<fileCollection>:create`。这样可以让 UI 保持稳定，也方便后续增加预览、进度和表单级任务协调。

## Storage Check 接口

上传前调用 `storages:check`。请求只提供目标文件 collection，数据源通过 `X-Data-Source` Header 传递。

```ts
export type CheckStorageParams = {
  fileCollectionName: string;
};

export type StorageUploadRules = {
  size?: number;
  mimetype?: string | string[];
};

export type FileStorageInfo = {
  id: string | number;
  name: string;
  title?: string;
  type: string;
  rules?: StorageUploadRules;

  // true 表示浏览器直传到 Storage。
  clientUpload: boolean;
};

export type StorageCheckResult = {
  isSupportToUploadFiles: boolean;
  storage: FileStorageInfo;
};
```

`clientUpload` 由服务端 Storage provider 决定。没有声明客户端直传能力的 Storage 默认返回 `false`，页面不能根据 `storage.type` 自行猜测上传接口。

`isSupportToUploadFiles` 只有在目标 collection 存在并使用 `file` template 时才返回 `true`。Hook 收到 `false` 后应阻止上传；Storage 不存在或不可用时，则显示接口返回的错误。

服务端按下面的顺序解析 Storage：

```text
X-Data-Source
      ↓
fileCollectionName
      ↓
collection.options.storage
      ↓
当前数据源的默认 Storage（collection 没有单独绑定时）
```

公共 Hook 可以使用 TanStack Query 缓存结果：

```tsx
import { useQuery } from "@tanstack/react-query";

import { nocobaseClient } from "@/lib/nocobase/client";

export function useFileStorage(descriptor: FileFieldDescriptor) {
  const dataSourceKey = descriptor.dataSourceKey ?? "main";

  return useQuery({
    queryKey: [
      "nocobase",
      "file-storage",
      dataSourceKey,
      descriptor.fileCollection,
    ],
    queryFn: () =>
      nocobaseClient.action<StorageCheckResult>("storages", "check", {
        method: "POST",
        query: {
          fileCollectionName: descriptor.fileCollection,
        },
        headers:
          dataSourceKey !== "main"
            ? { "X-Data-Source": dataSourceKey }
            : undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });
}
```

缓存键包含 `dataSourceKey` 和 `fileCollection`。Storage 配置变化后，应主动让对应 Query 失效。

:::warning 注意

`storages:check`、multipart 上传、预签名初始化和创建文件记录都必须携带相同的 `X-Data-Source`。只在第一次请求中设置 Header 不够。

:::

## 上传前检查

Storage 规则是服务端允许的上限，字段描述可以在它的基础上进一步收紧限制。文件必须同时满足两组规则。

大小限制取两者中的较小值：

```ts
export function resolveMaxFileSize(
  descriptor: FileFieldDescriptor,
  storage: FileStorageInfo
) {
  const storageSize = storage.rules?.size;
  const fieldSize = descriptor.maxSize;

  if (storageSize !== undefined && fieldSize !== undefined) {
    return Math.min(storageSize, fieldSize);
  }

  return storageSize ?? fieldSize;
}
```

MIME type 规则支持完整类型、通配类型和扩展名：

```ts
function normalizeRules(rules?: string | string[]) {
  if (!rules) return [];

  return (Array.isArray(rules) ? rules : rules.split(","))
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);
}

export function matchesFileRules(
  file: File,
  rules?: string | string[]
) {
  const normalized = normalizeRules(rules);
  if (!normalized.length) return true;

  const mimetype = file.type.toLowerCase();
  const filename = file.name.toLowerCase();

  return normalized.some((rule) => {
    if (rule === "*" || rule === "*/*") return true;
    if (rule.startsWith(".")) return filename.endsWith(rule);
    if (rule.endsWith("/*")) {
      return mimetype.startsWith(rule.slice(0, -1));
    }
    return mimetype === rule;
  });
}
```

完整检查可以写成：

```ts
export type FileValidationResult =
  | { valid: true }
  | { valid: false; code: "size" | "mimetype"; message: string };

export function validateFileBeforeUpload(
  file: File,
  descriptor: FileFieldDescriptor,
  storage: FileStorageInfo
): FileValidationResult {
  const maxSize = resolveMaxFileSize(descriptor, storage);

  if (maxSize !== undefined && file.size > maxSize) {
    return {
      valid: false,
      code: "size",
      message: `File size exceeds ${maxSize} bytes`,
    };
  }

  if (!matchesFileRules(file, storage.rules?.mimetype)) {
    return {
      valid: false,
      code: "mimetype",
      message: "File type is not allowed by storage",
    };
  }

  if (!matchesFileRules(file, descriptor.accept)) {
    return {
      valid: false,
      code: "mimetype",
      message: "File type is not allowed for this field",
    };
  }

  return { valid: true };
}
```

前端检查只用于尽早反馈错误。NocoBase 服务端仍需执行最终的文件检查。

## 公共上传类型

第一阶段用统一类型描述上传输入和结果：

```ts
export type NocoBaseFileRecord = {
  id: string | number;
  title?: string;
  filename: string;
  extname?: string;
  size?: number;
  mimetype?: string;
  path?: string;
  url?: string;
  preview?: string;
  storageId?: string | number;
  meta?: Record<string, unknown>;
};

export type FileUploadOptions = {
  file: File;
  descriptor: FileFieldDescriptor;
  storage: FileStorageInfo;
  signal?: AbortSignal;
};
```

:::tip 类型说明

这些类型用于约定组件边界，仍属于开发草稿。实现时应根据实际 NocoBase 响应和页面表单类型继续收紧，不要为了迁就草稿类型使用 `any`。

:::

所有上传请求共用同一个数据源 Header helper：

```ts
export function getDataSourceHeaders(dataSourceKey = "main") {
  return dataSourceKey !== "main"
    ? { "X-Data-Source": dataSourceKey }
    : undefined;
}
```

## Multipart 上传

当 `storage.clientUpload` 为 `false` 时，对目标文件 collection 执行 multipart `create`：

```ts
import { nocobaseClient } from "@/lib/nocobase/client";

export async function uploadMultipart({
  file,
  descriptor,
  signal,
}: FileUploadOptions) {
  const dataSourceKey = descriptor.dataSourceKey ?? "main";
  const formData = new FormData();

  formData.append("file", file);

  return nocobaseClient.action<NocoBaseFileRecord>(
    descriptor.fileCollection,
    "create",
    {
      method: "POST",
      body: formData,
      signal,
      headers: getDataSourceHeaders(dataSourceKey),
    }
  );
}
```

不要手动设置 `Content-Type: multipart/form-data`。浏览器需要根据 `FormData` 自动生成 boundary，当前 `nocobaseClient` 已经能够正确处理这种请求体。

NocoBase 的文件上传中间件每个请求只接收一个文件。第一阶段如果用户一次选择多个文件，则逐个顺序调用 `uploadMultipart()`，不做并发调度。

## 客户端直传

当 `storage.clientUpload` 为 `true` 时，由同一个 `useFileUpload()` 调用客户端直传函数。页面不根据 `storage.type` 选择实现。

当前直传协议包含三步：

```text
调用 storages:createPresignedUrl
              ↓
浏览器 PUT 到 Storage
              ↓
调用 fileCollection:create 创建文件记录
```

预签名接口返回上传地址和创建文件记录所需的信息：

```ts
export type PresignedFileInfo = {
  key: string;
  title: string;
  extname?: string;
  size?: number;
  mimetype?: string;
  url?: string;
};

export type PresignedUploadResult = {
  putUrl: string;
  fileInfo: PresignedFileInfo;
};
```

直传函数可以按下面的结构实现：

```ts
import { nocobaseClient } from "@/lib/nocobase/client";

export async function uploadDirect({
  file,
  descriptor,
  storage,
  signal,
}: FileUploadOptions) {
  const dataSourceKey = descriptor.dataSourceKey ?? "main";
  const headers = getDataSourceHeaders(dataSourceKey);
  const mimetype = file.type || "application/octet-stream";

  const initialized =
    await nocobaseClient.action<PresignedUploadResult>(
      "storages",
      "createPresignedUrl",
      {
        method: "POST",
        headers,
        signal,
        body: {
          name: file.name,
          size: file.size,
          type: mimetype,
          storageId: storage.id,
          storageType: storage.type,
        },
      }
    );

  const uploaded = await fetch(initialized.putUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimetype,
    },
    body: file,
    signal,
  });

  if (!uploaded.ok) {
    throw new Error(`Direct upload failed (${uploaded.status})`);
  }

  const { fileInfo } = initialized;

  return nocobaseClient.action<NocoBaseFileRecord>(
    descriptor.fileCollection,
    "create",
    {
      method: "POST",
      headers,
      signal,
      body: {
        title: fileInfo.title,
        filename: fileInfo.key,
        extname: fileInfo.extname,
        path: "",
        size: fileInfo.size ?? file.size,
        url: fileInfo.url ?? "",
        mimetype: fileInfo.mimetype ?? mimetype,
        meta: {},
        storageId: storage.id,
      },
    }
  );
}
```

如果 PUT 成功，但创建文件记录失败，那么不能把这个文件写入表单。第一阶段只显示上传失败；临时对象补偿和自动清理留到后续实现。

## `useFileUpload()` 怎么组织

`useFileUpload()` 负责组合 Storage 查询、文件检查和两个上传函数：

```ts
export type FileUploadFieldValue =
  | NocoBaseFileRecord
  | NocoBaseFileRecord[]
  | null;

export type FileUploadItem = {
  key: string;
  rawFile?: File;
  displayName: string;
  status: "pending" | "uploading" | "done" | "error" | "cancelled";
  record?: NocoBaseFileRecord;
  error?: Error;
};

export type UseFileUploadOptions = {
  descriptor: FileFieldDescriptor;
  value: FileUploadFieldValue;
  onChange: (value: FileUploadFieldValue) => void;
  disabled?: boolean;
  readOnly?: boolean;
  maxFiles?: number;
};
```

上传单个文件时，先检查规则，再根据 `clientUpload` 选择普通函数：

```ts
async function uploadOne(
  file: File,
  descriptor: FileFieldDescriptor,
  storage: FileStorageInfo,
  signal?: AbortSignal
) {
  const options = { file, descriptor, storage, signal };

  return storage.clientUpload
    ? uploadDirect(options)
    : uploadMultipart(options);
}
```

第一阶段允许文件选择器返回多个文件，不过 Hook 应顺序处理，避免并发完成时覆盖受控值：

```ts
for (const file of selectedFiles) {
  const record = await uploadOne(file, descriptor, storage, signal);
  recordsRef.current = descriptor.multiple
    ? [...recordsRef.current, record]
    : [record];

  onChange(
    descriptor.multiple
      ? recordsRef.current
      : recordsRef.current[0] ?? null
  );
}
```

`recordsRef` 需要在外部 `value` 变化时同步。这样即使业务表单执行 reset，Hook 也不会继续使用旧值。

Hook 内部把单值和数组统一归一化为 `recordsRef.current` 数组。单文件字段一次只接收第一个文件，多文件字段还要同时遵守 `maxFiles`。

## 设计 shadcn/ui 组件

shadcn/ui 没有一个必须遵守的 Upload 抽象。组件可以用当前项目已有的基础组件组合，并保留原生 `<input type="file">` 打开文件选择器。

第一阶段推荐这些组件：

| 能力 | shadcn/ui 组件 |
|---|---|
| 选择文件和操作按钮 | `Button` |
| 文件状态 | `Badge` |
| 错误反馈 | `Alert` |
| 加载 Storage 配置 | `Skeleton` |

不需要引入 `Progress`、`Dialog` 或预览组件。基础组件从 `@/components/ui/*` 引入，图标使用 `lucide-react`，样式放在 Tailwind class 中。

组件使用受控接口：

```ts
export type FileUploadFieldProps = {
  descriptor: FileFieldDescriptor;
  value: FileUploadFieldValue;
  onChange: (value: FileUploadFieldValue) => void;

  disabled?: boolean;
  readOnly?: boolean;
  maxFiles?: number;
  className?: string;

  onUploadStart?: (file: File) => void;
  onUploadComplete?: (
    record: NocoBaseFileRecord,
    file: File
  ) => void;
  onUploadError?: (error: Error, file: File) => void;
};
```

其中：

- `value` 只包含上传完成的服务端文件记录
- `maxFiles` 限制当前字段可保留的文件数
- `disabled` 禁用选择、拖拽、重试、取消和移除
- `readOnly` 只展示已有文件名，不显示修改操作
- 原始 `File` 和 `AbortController` 不进入业务表单值

组件至少覆盖下面的状态：

| 状态 | 界面行为 |
|---|---|
| 初始化 Storage | 显示 `Skeleton`，暂时禁用选择文件。 |
| Storage 不可用 | 显示错误，并禁用上传。 |
| 空值 | 显示拖拽区、「选择文件」按钮和规则提示。 |
| 上传中 | 显示文件名和上传中状态，不显示百分比。 |
| 上传完成 | 显示文件名、大小、MIME type 和移除操作。 |
| 上传失败 | 显示错误消息，并提供「重试 / 移除」。 |
| 只读 | 隐藏上传、取消、重试和移除操作。 |
| 达到数量限制 | 禁用拖拽区，并说明已达到文件数量上限。 |

拖拽和点击选择必须经过同一个 `addFiles()` 入口。这样大小检查、MIME type 检查、数量限制和重复文件处理只实现一次。

### 无障碍要求

文件上传组件需要补齐这些行为：

- 原生 file input 与「选择文件」按钮通过 ref 关联
- 纯图标按钮提供 `aria-label`
- 上传完成、失败和取消消息写入 `aria-live="polite"` 区域
- 错误信息不仅依靠颜色区分
- 焦点状态使用现有 `ring` token
- `disabled` 和 `readOnly` 同时作用于文件选择和拖拽事件

## 与 React Hook Form 配合

上传完成后，完整的 `NocoBaseFileRecord` 写入 React Hook Form。当前项目默认使用 `FormField`、`FormItem`、`FormLabel`、`FormControl` 和 `FormMessage`：

```tsx
<FormField
  control={form.control}
  name="documents"
  rules={{
    required: "Please upload at least one file",
  }}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Documents</FormLabel>
      <FormControl>
        <FileUploadField
          descriptor={contractDocuments}
          value={field.value ?? null}
          onChange={field.onChange}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

页面中的标题、按钮和错误消息应接入当前项目的 i18n，不要把示例英文直接复制成最终文案。

业务表单提交时，将完整文件记录转换为 association 主键引用：

```ts
export function serializeFileFieldValue(
  descriptor: FileFieldDescriptor,
  value: FileUploadFieldValue
) {
  const records = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  const references = records.map((record) => ({
    id: record.id,
  }));

  if (
    descriptor.relation === "belongsTo" ||
    descriptor.relation === "hasOne"
  ) {
    return references[0] ?? null;
  }

  return references;
}
```

创建业务记录时仍使用现有 Refine DataProvider：

```ts
const payload = {
  ...values,
  documents: serializeFileFieldValue(
    contractDocuments,
    values.documents
  ),
};

await createContract({
  resource: "contracts",
  values: payload,
  meta: {
    appends: ["documents"],
  },
});
```

`meta.appends` 会让 NocoBase 在业务记录响应中带回关联文件。不过第一阶段不使用文件 URL 做预览或下载。

## 编辑、移除与删除

编辑表单加载已有文件时，直接把服务端返回的文件记录作为组件值。用户从表单中移除文件时，默认只移除 association：

```ts
onChange(
  records.filter((record) => record.id !== removed.id)
);
```

不要在移除操作中默认调用文件 collection 的 `destroy`。已有文件可能被其他记录引用，也可能来自其他业务流程。

第一阶段取消上传也不自动删除已经创建的文件记录。关闭页面、断网或业务表单提交失败仍可能留下没有关联的文件，自动清理留到后续由服务端统一处理。

## 作为 Registry item 提供

当前项目的 Registry 可以理解为一组可通过 shadcn CLI 安装的源码包。第一阶段只需要一个 `file-upload` item，不需要把 Runtime 和 UI 拆开。

源码目录建议这样组织：

```text
registry/nocobase-file-upload/
├── README.md
├── types.ts
├── storage.ts
├── validation.ts
├── form-value.ts
├── upload-multipart.ts
├── upload-direct.ts
├── use-file-storage.ts
├── use-file-upload.ts
├── file-upload-field.tsx
└── index.ts
```

其中，`registry/` 是组件模板的源码目录。`src/extensions/nocobase-file-upload/` 是安装到当前 Starter 后的结果，不应作为主要维护入口。

在 `registry.config.json` 中增加一个 item：

```json
{
  "name": "file-upload",
  "type": "registry:block",
  "title": "NocoBase File Upload",
  "description": "Controlled shadcn/ui file upload field for NocoBase file collections.",
  "dependencies": [
    "@tanstack/react-query@^5.81.5",
    "lucide-react@^0.487.0"
  ],
  "registryDependencies": [
    "alert",
    "badge",
    "button",
    "skeleton"
  ],
  "docs": "Requires the Starter NocoBase client and a field targeting a file-template collection.",
  "source": {
    "root": "registry/nocobase-file-upload",
    "target": "src/extensions/nocobase-file-upload",
    "include": ["."]
  }
}
```

其中：

- `dependencies` 安装组件需要的 npm 包
- `registryDependencies` 安装组件依赖的 shadcn/ui 基础组件
- `source.root` 指向 Registry 源码
- `source.target` 指向安装到 Starter 后的位置
- `source.include` 决定这个 item 包含哪些文件

第一阶段不需要 `extension.tsx`。组件没有全局 Provider、路由和导航，业务页面可以直接导入：

```ts
import {
  FileUploadField,
  serializeFileFieldValue,
} from "@/extensions/nocobase-file-upload";
```

只有后续增加全局上传任务管理或独立 Demo 路由时，才需要通过 `extension.tsx` 接入 Starter 的自动发现机制。

开发时可以运行下面的命令刷新安装结果并构建 Registry：

```bash
yarn registry:preview
yarn registry:build
```

`registry:preview` 会把 Registry 源码复制到 `src/extensions/`，`registry:build` 会生成 `registry.json` 和可供 shadcn CLI 使用的 Registry 文件。

## AI 页面生成约定

生成包含文件字段的页面时，AI 应遵守下面的约定：

1. 从建模工具读取 source collection、字段名、target collection、association 类型和数据源
2. 确认字段指向用户创建的 `file` template collection
3. 生成不包含 `storageName` 的 `FileFieldDescriptor`
4. 使用公共 `FileUploadField`，不重复生成上传请求
5. 表单状态保存完整的 `NocoBaseFileRecord`
6. 提交前使用 `serializeFileFieldValue()` 转换 association 值
7. 列表和详情查询需要加载文件记录时，将字段加入 `appends`
8. 删除业务 association 和删除文件记录使用两个独立操作

## 开发检查清单

实现或验收第一阶段文件上传时，至少检查这些场景：

- 文件字段没有配置目标文件 collection 时阻止生成
- 目标 collection 不是 `file` template 时阻止生成和上传
- 两个文件字段指向不同的自定义文件 collection
- 点击选择和拖拽使用相同的检查流程
- 字段使用当前数据源的默认 Storage
- 目标文件 collection 绑定了自定义 Storage
- `storages:check` 携带正确的 `X-Data-Source`
- multipart 上传携带正确的 `X-Data-Source`
- 预签名初始化和文件记录创建携带正确的 `X-Data-Source`
- `clientUpload: false` 时执行 multipart 上传
- `clientUpload: true` 时执行客户端直传
- Storage 没有配置或不支持上传
- 文件超过 Storage 大小限制
- 文件满足字段规则但不满足 Storage MIME type 规则
- 单文件字段替换已有文件
- 多文件按选择顺序逐个上传
- 一个文件失败后显示明确错误
- 上传过程中取消请求
- 编辑表单移除已有文件时只解除 association
- `appends` 返回的文件记录能写入表单初始值
- PUT 成功但创建文件记录失败时不更新表单值
- `yarn registry:preview` 可以安装组件源码
- `yarn registry:build` 可以生成 Registry 文件

## 后续扩展

第一阶段稳定后，再按实际需要增加这些能力：

| 能力 | 建议放在哪里 |
|---|---|
| 上传百分比 | 扩展传输层，并在 `FileUploadItem` 中增加进度。 |
| 文件预览和下载 | 增加文件访问 Hook，区分公共地址、认证 Blob 和临时地址。 |
| 多文件并发 | 在 `useFileUpload()` 中增加并发队列和完成顺序处理。 |
| 禁止表单提交 | 增加表单级上传任务 Provider 或 pending 状态回调。 |
| 孤立文件清理 | 由服务端定期清理超过保留时间且没有 association 的文件。 |
| Demo 页面 | 新增可选 Registry item，并通过 `extension.tsx` 注册路由。 |

## 相关文件

- [Registry 配置](../registry.config.json) — 定义 Registry item、依赖和源码映射
- [Registry 构建脚本](../scripts/registry.mjs) — 负责安装、预览和构建 Registry
- [NocoBase 客户端](../src/lib/nocobase/client.ts) — 提供带认证信息的请求封装
- [React Hook Form 示例](../src/pages/users/form-fields.tsx) — 当前 Starter 的表单字段组合方式
