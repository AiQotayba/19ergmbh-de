import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import PhoneInputWithCountry, { type Value } from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneNumberInputProps {
  value?: string;
  onChange?: (value: Value) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const PhoneNumberInput = forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  ({ value, onChange, className, disabled, id }, ref) => (
    <div dir="ltr" className={cn("phone-input-root", className)}>
      <PhoneInputWithCountry
        id={id}
        international
        defaultCountry="DE"
        value={value}
        onChange={(v) => onChange?.(v ?? ("" as Value))}
        disabled={disabled}
        inputRef={ref}
        className="PhoneInput"
      />
    </div>
  ),
);
PhoneNumberInput.displayName = "PhoneNumberInput";
