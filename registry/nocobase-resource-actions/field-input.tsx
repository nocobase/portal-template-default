import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { ResourceActionField } from "./types";

export function ResourceActionFieldInput({
  field,
  id,
  ariaLabelledBy,
  value,
  onChange,
  disabled,
}: {
  field: ResourceActionField;
  id: string;
  ariaLabelledBy?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  if (field.renderInput) {
    return field.renderInput({
      id,
      ariaLabelledBy,
      value,
      onChange,
      disabled,
    });
  }
  if (field.input === "checkbox") {
    return (
      <Checkbox
        id={id}
        aria-labelledby={ariaLabelledBy}
        checked={value === true}
        disabled={disabled}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
    );
  }
  if (field.input === "select") {
    const selectedValue = typeof value === "string" ? value : null;
    return (
      <Select value={selectedValue} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full" aria-labelledby={ariaLabelledBy}>
          <SelectValue placeholder={field.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (field.input === "textarea") {
    return (
      <Textarea
        id={id}
        aria-labelledby={ariaLabelledBy}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  return (
    <Input
      id={id}
      aria-labelledby={ariaLabelledBy}
      type={field.input ?? "text"}
      value={typeof value === "string" || typeof value === "number" ? value : ""}
      placeholder={field.placeholder}
      disabled={disabled}
      onChange={(event) =>
        onChange(
          field.input === "number"
            ? event.target.value === ""
              ? undefined
              : event.target.valueAsNumber
            : event.target.value
        )
      }
    />
  );
}
