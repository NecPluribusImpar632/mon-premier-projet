"use client";

import { useRef, useState, type ChangeEvent } from "react";

interface FormattedNumberInputProps {
  value?: number;
  onChange?: (value: number) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const groupFormatter = new Intl.NumberFormat("fr-FR");

function toDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

function formatDigits(digits: string): string {
  if (!digits) return "";
  return groupFormatter.format(Number(digits));
}

/**
 * Plain-text input that live-formats whole numbers with thousands
 * separators (e.g. typing 500000 renders as "500 000"). Submits the
 * formatted string under `name` — server actions should strip
 * non-digit characters before parsing.
 */
export function FormattedNumberInput({
  value,
  onChange,
  name,
  placeholder,
  required,
  className,
}: FormattedNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState(() =>
    value ? formatDigits(String(value)) : ""
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = toDigits(input.value.slice(0, cursor)).length;

    const digits = toDigits(input.value);
    const formatted = formatDigits(digits);

    setDisplay(formatted);
    onChange?.(digits ? Number(digits) : 0);

    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      let seen = 0;
      let pos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          seen++;
          if (seen === digitsBeforeCursor) {
            pos = i + 1;
            break;
          }
        }
      }
      if (digitsBeforeCursor === 0) pos = 0;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      name={name}
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
