import { type HttpError, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useMemo } from "react";
import { useNavigate } from "react-router";

import { CreateView } from "@/components/resources/views/create-view";
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

export const UserCreate = () => {
  const translate = useTranslate();
  const navigate = useNavigate();
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<UserRecord, HttpError, UserFormValues>({
    refineCoreProps: {
      redirect: "list",
    },
    defaultValues: {
      nickname: "",
      username: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const aiFields = useMemo<AIFormField[]>(
    () => getAIUserFormFields(translate),
    [translate]
  );
  const aiFormRef = useAIForm({
    id: "users-create-form",
    title: translate("users.ai.createForm", { ns: "app" }, "Create user form"),
    fields: aiFields,
    getValues: () => getAIUserFormValues(form.getValues()),
    setValues: (values) => applyAIUserFormValues(form, values),
  });

  return (
    <CreateView>
      <Card className="max-w-3xl">
        <CardContent>
          <Form {...form}>
            <form
              ref={aiFormRef}
              onSubmit={form.handleSubmit((values) => onFinish(values))}
              className="resource-form"
            >
              <UserFormFields
                form={form}
                includePassword
                translate={translate}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  {...form.saveButtonProps}
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? translate(
                        "users.form.create.submitting",
                        { ns: "app" },
                        "Creating..."
                      )
                    : translate(
                        "users.form.create.submit",
                        { ns: "app" },
                        "Create user"
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
    </CreateView>
  );
};
