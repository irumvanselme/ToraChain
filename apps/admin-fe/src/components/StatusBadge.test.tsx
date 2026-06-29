import { render } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { StatusBadge } from "./StatusBadge.tsx";

describe("StatusBadge", () => {
  test("should render", () => {
    const element = render(<StatusBadge status={"draft"} />);
    expect(element.baseElement).toMatchSnapshot();
  });
});
