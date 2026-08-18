import { exports } from "cloudflare:workers";

import { describe, expect, it } from "vitest";

describe("Authentication cache policy", () => {
  it("marks auth responses as no-store even when Device authentication fails", async () => {
    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/employees"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("marks PIN endpoint errors as no-store", async () => {
    const response = await exports.default.fetch(
      new Request("https://example.test/api/auth/pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: "employee-01",
          pin: "0012",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
