import React from "react";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Shared labeled select used across forms. Composed from shadcn/ui's
 * Radix-based Select so every dropdown in the app shares one
 * implementation instead of mixing native <select> and Radix Select.
 *
 * @param {{
 *   label?: string,
 *   options?: Array<{ value: string, label: string }>,
 *   value?: string,
 *   onValueChange?: (value: string) => void,
 *   error?: string,
 *   id?: string,
 *   name?: string,
 *   placeholder?: string,
 * }} props
 */
export function FormSelect({ label, options = [], value, onValueChange, error, id, name, placeholder }) {
  const fieldId = id || name || (label ? label.toLowerCase().replace(/\W+/g, "-") : undefined);

  return (
    <Field data-invalid={!!error}>
      {label && <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>}
      <Select value={value} onValueChange={onValueChange} name={name}>
        <SelectTrigger id={fieldId} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
