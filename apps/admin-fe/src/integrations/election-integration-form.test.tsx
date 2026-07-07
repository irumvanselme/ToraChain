import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ApiError } from "api/error";
import type { Integration } from "api/integrations";
import { ElectionIntegrationForm } from "./election-integration-form.tsx";

const getIntegration = vi.fn();
const upsertIntegration = vi.fn();
const deleteIntegration = vi.fn();

vi.mock("api/integrations", () => ({
  getIntegration: (...a: unknown[]) => getIntegration(...a),
  upsertIntegration: (...a: unknown[]) => upsertIntegration(...a),
  deleteIntegration: (...a: unknown[]) => deleteIntegration(...a),
}));

function makeIntegration(overrides: Partial<Integration> = {}): Integration {
  return {
    integrationId: "int-1",
    electionId: "e1",
    type: "http_api",
    config: {
      url: "https://api.example.com/verify",
      method: "POST",
      apiKeyHeaderName: "x-api-key",
      apiKeyHeaderValue: "secret",
    },
    formFields: [
      {
        id: "national-id",
        label: "National ID",
        type: "string",
        description: "Your ID",
      },
    ],
    ...overrides,
  };
}

function renderForm(electionId = "e1") {
  return render(<ElectionIntegrationForm electionId={electionId} />);
}

beforeEach(() => {
  getIntegration.mockReset();
  upsertIntegration.mockReset();
  deleteIntegration.mockReset();
  getIntegration.mockResolvedValue(null);
  upsertIntegration.mockResolvedValue(makeIntegration());
  deleteIntegration.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ElectionIntegrationForm — loading & initial states", () => {
  test("shows a spinner while loading", () => {
    getIntegration.mockReturnValue(new Promise(() => {}));
    const { container } = renderForm();
    expect(
      container.querySelector(".loading, [class*='loading']"),
    ).toBeTruthy();
  });

  test("no integration → renders the type picker step", async () => {
    getIntegration.mockResolvedValue(null);
    renderForm();
    expect(
      await screen.findByText("Choose integration type"),
    ).toBeInTheDocument();
    // HTTP API card is highlighted by default → Configure button visible
    expect(
      screen.getByRole("button", { name: "Configure →" }),
    ).toBeInTheDocument();
    // Coming soon badges for the unavailable types
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
  });

  test("existing integration → renders the configured summary card", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    renderForm();
    expect(await screen.findByText("Configured")).toBeInTheDocument();
    expect(
      screen.getByText("https://api.example.com/verify"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 form field configured")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    // "+ Add integration" is disabled in configured mode
    expect(
      screen.getByRole("button", { name: "+ Add integration" }),
    ).toBeDisabled();
  });

  test("load failure with ApiError shows the API message", async () => {
    getIntegration.mockRejectedValue(
      new ApiError(500, "boom", "Server on fire"),
    );
    renderForm();
    expect(await screen.findByText("Server on fire")).toBeInTheDocument();
    // Falls back to picker
    expect(screen.getByText("Choose integration type")).toBeInTheDocument();
  });

  test("load failure with a non-ApiError shows the generic message", async () => {
    getIntegration.mockRejectedValue(new Error("network"));
    renderForm();
    expect(
      await screen.findByText("Could not load integration."),
    ).toBeInTheDocument();
  });

  test("AbortError during load is swallowed (stays on spinner)", async () => {
    const abort = new DOMException("aborted", "AbortError");
    getIntegration.mockRejectedValue(abort);
    const { container } = renderForm();
    // Give the rejected promise a chance to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(
      container.querySelector(".loading, [class*='loading']"),
    ).toBeTruthy();
    expect(screen.queryByText("Choose integration type")).toBeNull();
  });
});

describe("ElectionIntegrationForm — type picker interactions", () => {
  test("clicking an unavailable card does nothing", async () => {
    renderForm();
    await screen.findByText("Choose integration type");
    const web3 = screen.getByText("Web3 / Smart Contract").closest("div")!
      .parentElement!.parentElement!;
    // Unavailable cards have no button role
    fireEvent.click(web3);
    // still on picker, http_api still highlighted (only one "Selected")
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  test("Configure button advances to the config form", async () => {
    renderForm();
    await screen.findByText("Choose integration type");
    fireEvent.click(screen.getByRole("button", { name: "Configure →" }));
    expect(
      await screen.findByText("HTTP API Configuration"),
    ).toBeInTheDocument();
  });

  test("double-clicking the HTTP API card advances to the config form", async () => {
    renderForm();
    await screen.findByText("Choose integration type");
    const card = screen.getByText("HTTP API").closest("[role='button']")!;
    fireEvent.doubleClick(card);
    expect(
      await screen.findByText("HTTP API Configuration"),
    ).toBeInTheDocument();
  });

  test("Enter key configures; Space key highlights", async () => {
    renderForm();
    await screen.findByText("Choose integration type");
    const card = screen.getByText("HTTP API").closest("[role='button']")!;
    fireEvent.keyDown(card, { key: " " });
    // still on picker
    expect(screen.getByText("Choose integration type")).toBeInTheDocument();
    fireEvent.keyDown(card, { key: "Enter" });
    expect(
      await screen.findByText("HTTP API Configuration"),
    ).toBeInTheDocument();
  });

  test("keyboard on an unavailable card is ignored", async () => {
    renderForm();
    await screen.findByText("Choose integration type");
    const web3Label = screen.getByText("Web3 / Smart Contract");
    // The card wrapper is the label's grandparent
    const card = web3Label.closest("div")!.parentElement!.parentElement!;
    fireEvent.keyDown(card, { key: "Enter" });
    expect(screen.getByText("Choose integration type")).toBeInTheDocument();
  });

  test("Back button returns from config form to the picker", async () => {
    renderForm();
    await screen.findByText("Choose integration type");
    fireEvent.click(screen.getByRole("button", { name: "Configure →" }));
    await screen.findByText("HTTP API Configuration");
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(
      await screen.findByText("Choose integration type"),
    ).toBeInTheDocument();
  });
});

describe("ElectionIntegrationForm — config form editing", () => {
  async function gotoConfig() {
    renderForm();
    await screen.findByText("Choose integration type");
    fireEvent.click(screen.getByRole("button", { name: "Configure →" }));
    await screen.findByText("HTTP API Configuration");
  }

  test("edits HTTP config fields (method, url, headers)", async () => {
    await gotoConfig();
    fireEvent.change(screen.getByLabelText("HTTP Method"), {
      target: { value: "GET" },
    });
    expect(
      (screen.getByLabelText("HTTP Method") as HTMLSelectElement).value,
    ).toBe("GET");
    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://foo.test/verify" },
    });
    expect(
      (screen.getByLabelText("Endpoint URL") as HTMLInputElement).value,
    ).toBe("https://foo.test/verify");
    fireEvent.change(screen.getByLabelText("API Key Header Name"), {
      target: { value: "authorization" },
    });
    expect(
      (screen.getByLabelText("API Key Header Name") as HTMLInputElement).value,
    ).toBe("authorization");
    fireEvent.change(screen.getByLabelText("API Key Header Value"), {
      target: { value: "topsecret" },
    });
    expect(
      (screen.getByLabelText("API Key Header Value") as HTMLInputElement).value,
    ).toBe("topsecret");
  });

  test("adds, edits and removes form fields", async () => {
    await gotoConfig();
    expect(screen.getByText(/No fields configured yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Add field" }));
    expect(screen.getByText("Field 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Field ID"), {
      target: { value: "passport" },
    });
    expect((screen.getByLabelText("Field ID") as HTMLInputElement).value).toBe(
      "passport",
    );
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "Passport No" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Enter passport" },
    });
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "fingerprint" },
    });
    expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe(
      "fingerprint",
    );

    // Add a second field, then remove the first
    fireEvent.click(screen.getByRole("button", { name: "+ Add field" }));
    expect(screen.getByText("Field 2")).toBeInTheDocument();
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[0]);
    // one field left
    expect(screen.queryByText("Field 2")).toBeNull();
    expect(screen.getByText("Field 1")).toBeInTheDocument();
  });

  test("save (add) succeeds → configured summary with success alert", async () => {
    upsertIntegration.mockResolvedValue(makeIntegration({ formFields: [] }));
    renderForm();
    await screen.findByText("Choose integration type");
    fireEvent.click(screen.getByRole("button", { name: "Configure →" }));
    await screen.findByText("HTTP API Configuration");
    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://foo.test/verify" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add integration" }));
    expect(await screen.findByText("Integration added.")).toBeInTheDocument();
    expect(upsertIntegration).toHaveBeenCalledWith("e1", {
      type: "http_api",
      config: expect.objectContaining({ url: "https://foo.test/verify" }),
      formFields: [],
    });
  });

  test("save failure with ApiError shows the message", async () => {
    upsertIntegration.mockRejectedValue(
      new ApiError(400, "bad", "Invalid config"),
    );
    renderForm();
    await screen.findByText("Choose integration type");
    fireEvent.click(screen.getByRole("button", { name: "Configure →" }));
    await screen.findByText("HTTP API Configuration");
    fireEvent.click(screen.getByRole("button", { name: "Add integration" }));
    expect(await screen.findByText("Invalid config")).toBeInTheDocument();
  });

  test("save failure with a non-ApiError shows the generic message", async () => {
    upsertIntegration.mockRejectedValue(new Error("oops"));
    renderForm();
    await screen.findByText("Choose integration type");
    fireEvent.click(screen.getByRole("button", { name: "Configure →" }));
    await screen.findByText("HTTP API Configuration");
    fireEvent.click(screen.getByRole("button", { name: "Add integration" }));
    expect(
      await screen.findByText("Failed to save integration."),
    ).toBeInTheDocument();
  });
});

describe("ElectionIntegrationForm — editing an existing integration", () => {
  test("Edit → config form prefilled → save updates", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    upsertIntegration.mockResolvedValue(makeIntegration());
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    // Draft badge shows while editing
    expect(await screen.findByText("Draft")).toBeInTheDocument();
    expect(
      (screen.getByLabelText("Endpoint URL") as HTMLInputElement).value,
    ).toBe("https://api.example.com/verify");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Integration updated.")).toBeInTheDocument();
  });

  test("Cancel from edit returns to the configured summary", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByText("Draft");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Configured")).toBeInTheDocument();
  });

  test("Back to picker from edit then re-highlight the type", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByText("HTTP API Configuration");
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    // now on picker while editing
    expect(
      await screen.findByText("Choose integration type"),
    ).toBeInTheDocument();
    // clicking the highlighted card triggers handleHighlight (editing branch)
    const card = screen.getByRole("button", { name: /HTTP API/ });
    fireEvent.click(card);
    expect(screen.getByText("Choose integration type")).toBeInTheDocument();
    // Configure from the editing picker triggers handleConfigure (editing branch)
    fireEvent.click(screen.getByRole("button", { name: "Configure →" }));
    expect(
      await screen.findByText("HTTP API Configuration"),
    ).toBeInTheDocument();
  });

  test("legacy field type stays selectable in the type dropdown", async () => {
    getIntegration.mockResolvedValue(
      makeIntegration({
        formFields: [
          {
            id: "x",
            label: "X",
            type: "custom-legacy",
            description: "",
          },
        ],
      }),
    );
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByText("HTTP API Configuration");
    const typeSelect = screen.getByLabelText("Type") as HTMLSelectElement;
    expect(typeSelect.value).toBe("custom-legacy");
    // the legacy option was appended
    expect(
      within(typeSelect).getByRole("option", { name: "custom-legacy" }),
    ).toBeInTheDocument();
  });

  test("field with null type falls back to string in the select", async () => {
    getIntegration.mockResolvedValue(
      makeIntegration({
        formFields: [{ id: "x", label: "X", type: null, description: "" }],
      }),
    );
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByText("HTTP API Configuration");
    expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe(
      "string",
    );
  });
});

describe("ElectionIntegrationForm — delete", () => {
  test("delete confirmed removes the integration", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    deleteIntegration.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Integration removed.")).toBeInTheDocument();
    expect(deleteIntegration).toHaveBeenCalledWith("e1");
    // back to picker
    expect(screen.getByText("Choose integration type")).toBeInTheDocument();
  });

  test("delete cancelled at the confirm dialog is a no-op", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(deleteIntegration).not.toHaveBeenCalled();
    expect(screen.getByText("Configured")).toBeInTheDocument();
  });

  test("delete failure with ApiError shows the message", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    deleteIntegration.mockRejectedValue(
      new ApiError(409, "conflict", "Cannot remove"),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Cannot remove")).toBeInTheDocument();
  });

  test("delete failure with a non-ApiError shows the generic message", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    deleteIntegration.mockRejectedValue(new Error("x"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      await screen.findByText("Failed to remove integration."),
    ).toBeInTheDocument();
  });

  test("remove integration from within the edit form", async () => {
    getIntegration.mockResolvedValue(makeIntegration());
    deleteIntegration.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();
    await screen.findByText("Configured");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByText("HTTP API Configuration");
    fireEvent.click(screen.getByRole("button", { name: "Remove integration" }));
    expect(await screen.findByText("Integration removed.")).toBeInTheDocument();
  });
});

describe("ElectionIntegrationForm — summary rendering branches", () => {
  test("http_api integration without a url shows the placeholder summary", async () => {
    getIntegration.mockResolvedValue(
      makeIntegration({ config: { method: "POST" }, formFields: [] }),
    );
    renderForm();
    await screen.findByText("Configured");
    expect(screen.getByText("No URL configured")).toBeInTheDocument();
    // 0 form fields → plural "fields"
    expect(screen.getByText("0 form fields configured")).toBeInTheDocument();
  });

  test("non-http integration falls back to its type as label & summary", async () => {
    getIntegration.mockResolvedValue(
      makeIntegration({ type: "mystery", config: {}, formFields: [] }),
    );
    renderForm();
    await screen.findByText("Configured");
    // typeDef returns undefined → label falls back to raw type; appears twice
    expect(screen.getAllByText("mystery").length).toBeGreaterThan(0);
  });
});
