import { API_BASE } from "lib/config";
import { request } from "api/request";

export interface FormField {
  id: string;
  label: string;
  type: string | null;
  description: string;
}

export interface Integration {
  integrationId: string;
  electionId: string;
  /** Integration type (e.g. "http_api"). More types will be added later. */
  type: string;
  /** Type-specific config blob. */
  config: Record<string, unknown>;
  formFields: FormField[];
}

export interface HttpApiConfig {
  url: string;
  method: "GET" | "POST";
  apiKeyHeaderName: string;
  apiKeyHeaderValue: string;
}

export interface UpsertIntegrationInput {
  type: string;
  config: Record<string, unknown>;
  formFields: FormField[];
}

const root = (electionId: string) =>
  `${API_BASE}/elections/${electionId}/integration`;

export function getIntegration(
  electionId: string,
  signal?: AbortSignal,
): Promise<Integration | null> {
  return request<Integration>(root(electionId), { signal }).catch((err) => {
    if ("status" in err && err.status === 404) return null;
    throw err;
  });
}

export function upsertIntegration(
  electionId: string,
  input: UpsertIntegrationInput,
): Promise<Integration> {
  return request<Integration>(root(electionId), { method: "PUT", body: input });
}

export function deleteIntegration(electionId: string): Promise<void> {
  return request<void>(root(electionId), { method: "DELETE" });
}
