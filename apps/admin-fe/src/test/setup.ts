import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom does not implement the Popover API (used by DateTimePicker); stub it so
// the calendar's change handler can call hidePopover() without throwing.
if (typeof HTMLElement !== "undefined") {
  HTMLElement.prototype.showPopover ??= function showPopover() {};
  HTMLElement.prototype.hidePopover ??= function hidePopover() {};
  HTMLElement.prototype.togglePopover ??= function togglePopover() {
    return false;
  };
}

afterEach(() => {
  cleanup();
});
