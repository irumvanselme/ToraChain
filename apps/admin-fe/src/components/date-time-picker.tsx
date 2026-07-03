import { useEffect, useId, useRef, type ReactNode } from "react";
import "cally";
import { cn } from "@tora-chain/ui-components";

/** A `<calendar-date>` element carries a `value` string in "YYYY-MM-DD" form. */
type CalendarDateEl = HTMLElement & { value: string };

/** Split a `datetime-local` value ("YYYY-MM-DDTHH:mm") into its date/time parts. */
function splitDateTime(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

/** Recombine a date + time into a `datetime-local` value, defaulting the time. */
function joinDateTime(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

/** Format a "YYYY-MM-DD" value for display, avoiding UTC timezone drift. */
function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export interface DateTimePickerProps {
  label?: ReactNode;
  /** A `datetime-local` value ("YYYY-MM-DDTHH:mm"), or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  error?: ReactNode;
  /** Earliest selectable date ("YYYY-MM-DD"). */
  min?: string;
  required?: boolean;
}

/**
 * Date-and-time field: a DaisyUI-styled Cally calendar (in a native popover)
 * for the date, paired with a time input. Emits a `datetime-local` string so it
 * is a drop-in for `<input type="datetime-local">`.
 */
export function DateTimePicker({
  label,
  value,
  onChange,
  error,
  min,
  required,
}: DateTimePickerProps) {
  const calendarRef = useRef<HTMLElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const popoverId = `dtp-${uid}`;
  const anchorName = `--dtp-${uid}`;

  const { date, time } = splitDateTime(value);

  // Read the freshest props from inside the (stable) change listener.
  const latest = useRef({ time, onChange });
  useEffect(() => {
    latest.current = { time, onChange };
  });

  // React to date picks and close the popover once a day is chosen.
  useEffect(() => {
    const el = calendarRef.current as CalendarDateEl | null;
    if (!el) return;
    const onPick = (event: Event) => {
      const picked = (event.target as CalendarDateEl | null)?.value ?? "";
      latest.current.onChange(joinDateTime(picked, latest.current.time));
      document.getElementById(popoverId)?.hidePopover();
    };
    el.addEventListener("change", onPick);
    return () => el.removeEventListener("change", onPick);
  }, [popoverId]);

  // Reflect external value changes onto the calendar web component.
  useEffect(() => {
    const el = calendarRef.current as CalendarDateEl | null;
    if (el) el.value = date;
  }, [date]);

  const invalid = Boolean(error);

  return (
    <label className="form-control w-full">
      {label && <span className="label-text mb-1 font-medium">{label}</span>}
      <div className="flex gap-2">
        <button
          type="button"
          popoverTarget={popoverId}
          className={cn(
            "input input-bordered flex-1 justify-start text-left font-normal",
            !date && "text-base-content/50",
            invalid && "input-error",
          )}
          style={{ anchorName }}
        >
          {date ? formatDate(date) : "Pick a date"}
        </button>

        <div
          popover="auto"
          id={popoverId}
          className="dropdown bg-base-100 rounded-box shadow-lg"
          style={{ positionAnchor: anchorName }}
        >
          <calendar-date ref={calendarRef} className="cally" min={min}>
            <svg
              aria-label="Previous"
              className="size-4 fill-current"
              slot="previous"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <svg
              aria-label="Next"
              className="size-4 fill-current"
              slot="next"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <calendar-month></calendar-month>
          </calendar-date>
        </div>

        <input
          type="time"
          className={cn("input input-bordered w-32", invalid && "input-error")}
          value={time}
          onChange={(event) => onChange(joinDateTime(date, event.target.value))}
          aria-label={typeof label === "string" ? `${label} (time)` : "Time"}
          required={required}
        />
      </div>
      {error && <span className="label-text-alt mt-1 text-error">{error}</span>}
    </label>
  );
}
