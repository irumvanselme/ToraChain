import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * JSX typings for the Cally (`cally`) web components used by `DateTimePicker`.
 * Cally registers the custom elements and augments `HTMLElementTagNameMap`,
 * but it does not describe them for React's JSX namespace — do that here.
 */
type CalendarElement = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
>;

type CalendarDateElement = CalendarElement & {
  value?: string;
  min?: string;
  max?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "calendar-date": CalendarDateElement;
      "calendar-month": CalendarElement;
    }
  }
}
