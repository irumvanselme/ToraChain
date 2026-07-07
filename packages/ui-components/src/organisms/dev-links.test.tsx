import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { DevLinks, DEFAULT_DEV_LINKS, type DevLink } from "./dev-links.tsx";
import { Server } from "lucide-react";

const links: DevLink[] = [
  {
    label: "Alpha",
    href: "https://alpha.test",
    icon: Server,
    color: "#111",
    group: "Group A",
  },
  {
    label: "Beta",
    href: "https://beta.test",
    icon: Server,
    color: "#222",
    group: "Group A",
  },
  {
    label: "Gamma",
    href: "/gamma",
    icon: Server,
    color: "#333",
    group: "Group B",
    newTab: false,
  },
];

describe("DEFAULT_DEV_LINKS", () => {
  test("maps every configured dev link to a resolved icon component", () => {
    expect(DEFAULT_DEV_LINKS.length).toBeGreaterThan(0);
    for (const link of DEFAULT_DEV_LINKS) {
      // lucide icons are React components (function or memo/forwardRef object)
      expect(link.icon).toBeTruthy();
      expect(["function", "object"]).toContain(typeof link.icon);
      expect(link.href).toBeTruthy();
    }
  });
});

describe("DevLinks", () => {
  test("renders nothing when disabled", () => {
    const { container } = render(<DevLinks enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when there are no links", () => {
    const { container } = render(<DevLinks links={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders a closed trigger by default with no links visible", () => {
    render(<DevLinks links={links} />);
    const trigger = screen.getByRole("button", { name: "Dev links" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  test("uses a custom trigger label", () => {
    render(<DevLinks links={links} label="Tools" />);
    expect(screen.getByRole("button", { name: "Tools" })).toBeInTheDocument();
  });

  test("opens the stack when the trigger is clicked", () => {
    render(<DevLinks links={links} />);
    fireEvent.click(screen.getByRole("button", { name: "Dev links" }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  test("shows a group header once per group", () => {
    render(<DevLinks links={links} />);
    fireEvent.click(screen.getByRole("button", { name: "Dev links" }));
    // "Group A" header appears once (only before the first Group A item)
    expect(screen.getAllByText("Group A").length).toBe(1);
    expect(screen.getAllByText("Group B").length).toBe(1);
  });

  test("renders external links with target=_blank and internal ones without", () => {
    render(<DevLinks links={links} />);
    fireEvent.click(screen.getByRole("button", { name: "Dev links" }));

    const alpha = screen.getByText("Alpha").closest("a")!;
    expect(alpha).toHaveAttribute("target", "_blank");
    expect(alpha).toHaveAttribute("rel", "noreferrer");

    const gamma = screen.getByText("Gamma").closest("a")!;
    expect(gamma).not.toHaveAttribute("target");
  });

  test("toggles closed when the trigger is clicked again", () => {
    render(<DevLinks links={links} />);
    const trigger = screen.getByRole("button", { name: "Dev links" });
    fireEvent.click(trigger);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  test("closes on Escape", () => {
    render(<DevLinks links={links} />);
    fireEvent.click(screen.getByRole("button", { name: "Dev links" }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  test("ignores non-Escape keys", () => {
    render(<DevLinks links={links} />);
    fireEvent.click(screen.getByRole("button", { name: "Dev links" }));
    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  test("closes on an outside click", () => {
    render(
      <div>
        <span data-testid="outside">outside</span>
        <DevLinks links={links} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dev links" }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  test("keeps open when clicking inside the widget", () => {
    render(<DevLinks links={links} />);
    fireEvent.click(screen.getByRole("button", { name: "Dev links" }));
    fireEvent.mouseDown(screen.getByText("Alpha"));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  test("runs the entrance transition after opening (raf callback)", async () => {
    render(<DevLinks links={links} />);
    fireEvent.click(screen.getByRole("button", { name: "Dev links" }));
    // opacity flips to 1 after two animation frames
    await waitFor(() => {
      const item = screen.getByText("Alpha").closest("a")!.parentElement!;
      expect(item.style.opacity).toBe("1");
    });
  });

  test.each(["bottom-left", "top-right", "top-left"] as const)(
    "renders in the %s corner",
    (position) => {
      render(<DevLinks links={links} position={position} />);
      fireEvent.click(screen.getByRole("button", { name: "Dev links" }));
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    },
  );
});
