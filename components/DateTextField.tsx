"use client";

import { formatIsoDateForDisplay } from "@/lib/dateDisplayFormat";

export const DATE_TEXT_PLACEHOLDER = "dd mmm yyyy";

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
  // Note: calendarButtonClassName remains in DateTextFieldProps for call-site
  // compatibility but is intentionally not destructured here — the whole field is
  // now the native date input's tap target, so a separate calendar button (and its
  // showPicker() call) is no longer needed.
}: DateTextFieldProps) {
  const display = value ? formatIsoDateForDisplay(value) : "";

  return (
    <div className="relative">
      {/* The real native date input fills the field. A tap anywhere on it opens the
          OS date picker natively on every platform — including iOS WebView, where
          showPicker() against a hidden input was a no-op. The input's own text is
          made transparent so it doesn't clash with the formatted overlay below. */}
      <input
        id={id}
        type="date"
        aria-label={calendarAriaLabel}
        aria-invalid={invalid || undefined}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={textInputClassName + " pr-date-input text-transparent"}
        style={{ colorScheme: "light" }}
      />
      {/* Formatted "dd mmm yyyy" display overlaid on top. pointer-events: none lets
          taps fall through to the native input behind it. */}
      <span
        aria-hidden
        className={
          "pointer-events-none absolute inset-y-0 left-3 z-[1] flex items-center text-base sm:text-sm " +
          (display ? "text-black" : "text-gray-700")
        }
      >
        {display || DATE_TEXT_PLACEHOLDER}
      </span>
    </div>
  );
}
