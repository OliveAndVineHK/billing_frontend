"use client";

import { useEffect, useRef, useState } from "react";
import { formatIsoDateAsDdMmmYyyy, parseDdMmmYyyyToIso } from "@/lib/dateDisplayFormat";
import { openDatePicker } from "@/lib/openDatePicker";

export const DATE_TEXT_PLACEHOLDER = "dd/mmm/yyyy";

export type DateTextFieldProps = {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  calendarAriaLabel: string;
  textInputClassName: string;
  calendarButtonClassName: string;
};

export function DateTextField({
  id,
  value,
  onChange,
  disabled = false,
  invalid = false,
  calendarAriaLabel,
  textInputClassName,
  calendarButtonClassName,
}: DateTextFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => (value ? formatIsoDateAsDdMmmYyyy(value) : ""));

  useEffect(() => {
    setText(value ? formatIsoDateAsDdMmmYyyy(value) : "");
  }, [value]);

  const handleBlur = () => {
    const parsed = parseDdMmmYyyyToIso(text);
    if (parsed === null) {
      setText(value ? formatIsoDateAsDdMmmYyyy(value) : "");
      return;
    }
    if (parsed !== value) onChange(parsed);
  };

  return (
    <div className="relative">
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
      <input
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        placeholder={DATE_TEXT_PLACEHOLDER}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onClick={() => openDatePicker(pickerRef.current)}
        aria-invalid={invalid || undefined}
        className={textInputClassName}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => openDatePicker(pickerRef.current)}
        className={calendarButtonClassName}
        aria-label={calendarAriaLabel}
      >
        <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
          calendar_clock
        </span>
      </button>
    </div>
  );
}
