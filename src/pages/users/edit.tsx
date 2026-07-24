import {
  type HttpError,
  useResourceParams,
  useTranslate,
} from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useMemo } from "react";
import { useNavigate } from "react-router";

import { EditView } from "@/components/resources/views/edit-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useAIForm, type AIFormField } from "@/extensions/nocobase-ai";
import {
  applyAIUserFormValues,
  getAIUserFormFields,
  getAIUserFormValues,
} from "./form-context";
import { UserFormFields } from "./form-fields";
import type { UserFormValues, UserRecord } from "./types";

export const UserEdit = () => {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { id } = useResourceParams();
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<UserRecord, HttpError, UserFormValues>({
    refineCoreProps: {
      redirect: "list",
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

  return (
    <EditView>
      <Card className="max-w-3xl">
        <CardContent>
          <Form {...form}>
            <form
              ref={aiFormRef}
              onSubmit={form.handleSubmit((values) => onFinish(values))}
              className="resource-form"
            >
              <UserFormFields form={form} translate={translate} />

              <div className="flex flex-wrap gap-2">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  {translate("users.form.cancel", { ns: "app" }, "Cancel")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </EditView>
  );
};
