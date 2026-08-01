import { type HttpError, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useMemo } from "react";
import { useParams } from "react-router";
import { useRouteSurfaceClose } from "@nocobase/portal-sdk/routing";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useAIForm, type AIFormField } from "./optional-ai";
import {
  getFileFieldAppends,
  serializeFileFieldValues,
} from "@/extensions/nocobase-file-upload";
import {
  RouteDrawer,
  RouteDrawerFooter,
  useRefineUnsavedChangesGuard,
} from "@/extensions/nocobase-route-surfaces";
import {
  applyAIUserFormValues,
  getAIUserFormFields,
  getAIUserFormValues,
} from "./form-context";
import { userFileDescriptors } from "./file-descriptors";
import { UserFormFields } from "./form-fields";
import { getUserShowPath, userRoutes } from "./routes";
import type { UserFormValues, UserRecord, UserSubmitValues } from "./types";

export const UserEdit = ({
  returnTo = "list",
}: {
  returnTo?: "list" | "show";
}) => {
  const translate = useTranslate();
  const { id } = useParams<{ id: string }>();
  const closeTo =
    returnTo === "show" && id ? getUserShowPath(id) : userRoutes.list;
  const { beforeClose, confirmation } = useRefineUnsavedChangesGuard();

  return (
    <>
      <RouteDrawer
        title={translate("users.drawer.edit.title", { ns: "app" }, "Edit user")}
        description={translate(
          "users.drawer.edit.description",
          { ns: "app" },
          "Update this user's identity and contact information."
        )}
        closeLabel={translate("buttons.close", "Close")}
        closeTo={closeTo}
        beforeClose={beforeClose}
      >
        <UserEditForm id={id} />
      </RouteDrawer>
      {confirmation}
    </>
  );
};

function UserEditForm({ id }: { id?: string }) {
  const translate = useTranslate();
  const close = useRouteSurfaceClose();
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<UserRecord, HttpError, UserFormValues>({
    refineCoreProps: {
      action: "edit",
      resource: "users",
      id,
      redirect: false,
      meta: {
        appends: getFileFieldAppends(userFileDescriptors),
      },
      onMutationSuccess: () => {
        close({ skipBeforeClose: true });
      },
    },
  });
  const aiFields = useMemo<AIFormField[]>(
    () => getAIUserFormFields(translate),
    [translate]
  );
  const aiFormRef = useAIForm({
    id: `users-edit-form-${id ?? "current"}`,
    title: translate("users.ai.editForm", { ns: "app" }, "Edit user form"),
    fields: aiFields,
    getValues: () => getAIUserFormValues(form.getValues()),
    setValues: (values) => applyAIUserFormValues(form, values),
  });

  const submitUser = onFinish as unknown as (
    values: UserSubmitValues
  ) => void | Promise<void>;

  return (
    <Form {...form}>
      <form
        ref={aiFormRef}
        onSubmit={form.handleSubmit((values) => {
          const payload = serializeFileFieldValues(
            values,
            userFileDescriptors
          ) as UserSubmitValues;

          return submitUser(payload);
        })}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 [&_[data-slot=input]]:h-10 [&_[data-slot=select-trigger]]:h-10 [&_[data-slot=textarea]]:min-h-56">
          <UserFormFields form={form} translate={translate} />
        </div>
        <RouteDrawerFooter className="flex-row justify-end">
          <Button type="button" variant="outline" onClick={() => close()}>
            {translate("users.form.cancel", { ns: "app" }, "Cancel")}
          </Button>
          <Button
            type="submit"
            {...form.saveButtonProps}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? translate(
                  "users.form.edit.submitting",
                  { ns: "app" },
                  "Saving..."
                )
              : translate(
                  "users.form.edit.submit",
                  { ns: "app" },
                  "Save changes"
                )}
          </Button>
        </RouteDrawerFooter>
      </form>
    </Form>
  );
}
