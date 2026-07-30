import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileUploadField } from "@/extensions/nocobase-file-upload";
import { userAvatarDescriptor, userFilesDescriptor } from "./file-descriptors";
import {
  getAvatarPreviewMessages,
  getAvatarUploadMessages,
  getFilesPreviewMessages,
  getFilesUploadMessages,
  type Translate,
} from "./file-messages";
import type { UserFormValues } from "./types";

export function UserFormFields({
  form,
  includePassword,
  translate,
}: {
  form: UseFormReturn<UserFormValues>;
  includePassword?: boolean;
  translate: Translate;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name={userAvatarDescriptor.fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {translate("users.fields.avatar", { ns: "app" }, "Avatar")}
            </FormLabel>
            <FormControl
              render={
                <FileUploadField
                  descriptor={userAvatarDescriptor}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  maxFiles={1}
                  messages={getAvatarUploadMessages(translate)}
                  previewMessages={getAvatarPreviewMessages(translate)}
                />
              }
            />
            <FormDescription>
              {translate(
                "users.form.avatar.description",
                { ns: "app" },
                "Upload an image to use as this user's avatar."
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={userFilesDescriptor.fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {translate("users.fields.files", { ns: "app" }, "Files")}
            </FormLabel>
            <FormControl
              render={
                <FileUploadField
                  descriptor={userFilesDescriptor}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  messages={getFilesUploadMessages(translate)}
                  previewMessages={getFilesPreviewMessages(translate)}
                />
              }
            />
            <FormDescription>
              {translate(
                "users.form.files.description",
                { ns: "app" },
                "Upload multiple files to test the user's file relation."
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="nickname"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {translate("users.fields.nickname", { ns: "app" }, "Nickname")}
            </FormLabel>
            <FormControl
              render={
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder={translate(
                    "users.form.nickname.placeholder",
                    { ns: "app" },
                    "Enter a display name"
                  )}
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="username"
        rules={{
          required: translate(
            "users.validation.username",
            { ns: "app" },
            "Username is required"
          ),
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {translate("users.fields.username", { ns: "app" }, "Username")}
            </FormLabel>
            <FormControl
              render={
                <Input
                  {...field}
                  value={field.value ?? ""}
                  autoComplete="username"
                  placeholder={translate(
                    "users.form.username.placeholder",
                    { ns: "app" },
                    "Enter a unique username"
                  )}
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        rules={{
          required: translate(
            "users.validation.email",
            { ns: "app" },
            "Email is required"
          ),
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: translate(
              "users.validation.emailFormat",
              { ns: "app" },
              "Enter a valid email address"
            ),
          },
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {translate("users.fields.email", { ns: "app" }, "Email")}
            </FormLabel>
            <FormControl
              render={
                <Input
                  {...field}
                  value={field.value ?? ""}
                  type="email"
                  autoComplete="email"
                  placeholder={translate(
                    "users.form.email.placeholder",
                    { ns: "app" },
                    "Enter an email address"
                  )}
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        rules={{
          required: translate(
            "users.validation.phone",
            { ns: "app" },
            "Phone is required"
          ),
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {translate("users.fields.phone", { ns: "app" }, "Phone")}
            </FormLabel>
            <FormControl
              render={
                <Input
                  {...field}
                  value={field.value ?? ""}
                  type="tel"
                  autoComplete="tel"
                  placeholder={translate(
                    "users.form.phone.placeholder",
                    { ns: "app" },
                    "Enter a phone number"
                  )}
                />
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      {includePassword ? (
        <FormField
          control={form.control}
          name="password"
          rules={{
            required: translate(
              "users.validation.password",
              { ns: "app" },
              "Password is required"
            ),
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {translate("users.fields.password", { ns: "app" }, "Password")}
              </FormLabel>
              <FormControl
                render={
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="password"
                    autoComplete="new-password"
                    placeholder={translate(
                      "users.form.password.placeholder",
                      { ns: "app" },
                      "Set an initial password"
                    )}
                  />
                }
              />
              <FormDescription>
                {translate(
                  "users.form.password.aiNotice",
                  { ns: "app" },
                  "Passwords are never included in AI page context or Form filler."
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </>
  );
}
