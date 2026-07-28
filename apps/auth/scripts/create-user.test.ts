import { describe, expect, it } from "vitest";

import { parseArgv } from "./create-user.ts";

describe("parseArgv", () => {
  it("reads `--flag value` pairs", () => {
    const { values } = parseArgv([
      "--user-type",
      "voters",
      "--name",
      "Jane Doe",
      "--email",
      "jane@example.com",
    ]);
    expect(values).toEqual({
      "user-type": "voters",
      name: "Jane Doe",
      email: "jane@example.com",
    });
  });

  it("reads `--flag=value` pairs, including values containing `=`", () => {
    const { values } = parseArgv(["--password=a=b=c", "--email=a@b.c"]);
    expect(values.password).toBe("a=b=c");
    expect(values.email).toBe("a@b.c");
  });

  it("keeps shell metacharacters in values verbatim", () => {
    const { values } = parseArgv(["--password", 'Pa$$w0rd! "quoted" $(id)']);
    expect(values.password).toBe('Pa$$w0rd! "quoted" $(id)');
  });

  it("accepts a value that starts with a dash", () => {
    // `node:util`'s parseArgs rejects this as "ambiguous"; we must not.
    expect(parseArgv(["--password", "-Pa$$w0rd!"]).values.password).toBe(
      "-Pa$$w0rd!",
    );
    expect(parseArgv(["--password=--weird--"]).values.password).toBe(
      "--weird--",
    );
  });

  it("ignores a forwarded `--` separator", () => {
    const { values } = parseArgv(["--", "--name", "Jane"]);
    expect(values.name).toBe("Jane");
  });

  it("collects boolean flags", () => {
    const { flags } = parseArgv(["--password-stdin", "--skip-existing"]);
    expect(flags.has("password-stdin")).toBe(true);
    expect(flags.has("skip-existing")).toBe(true);
    expect(flags.has("help")).toBe(false);
  });

  it("supports `--flag=false` to unset a boolean", () => {
    const { flags } = parseArgv(["--skip-existing=false"]);
    expect(flags.has("skip-existing")).toBe(false);
  });

  it("rejects unknown options, positionals and missing values", () => {
    expect(() => parseArgv(["--nope"])).toThrow(/Unknown option: --nope/);
    expect(() => parseArgv(["jane@example.com"])).toThrow(
      /Unexpected argument/,
    );
    expect(() => parseArgv(["--password"])).toThrow(
      /Missing value for --password/,
    );
    expect(() => parseArgv(["--password-stdin=maybe"])).toThrow(
      /does not take a value/,
    );
  });
});
