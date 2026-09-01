import React, { forwardRef } from "react";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/**
 * Shared labeled input field used across auth and prediction forms.
 * Composed from shadcn/ui primitives (Field + InputGroup) so every
 * input in the app shares one implementation and one design token set.
 */
export const FormField = forwardRef(
  ({ label, error, icon: Icon, id, name, className, ...props }, ref) => {
    const fieldId = id || name || (label ? label.toLowerCase().replace(/\W+/g, "-") : undefined);

    return (
      <Field data-invalid={!!error}>
        {label && <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>}
        <InputGroup>
          {Icon && (
            <InputGroupAddon>
              <Icon className="size-4" aria-hidden="true" />
            </InputGroupAddon>
          )}
          <InputGroupInput
            ref={ref}
            id={fieldId}
            name={name}
            aria-invalid={!!error}
            className={className}
            {...props}
          />
        </InputGroup>
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  }
);

FormField.displayName = "FormField";
