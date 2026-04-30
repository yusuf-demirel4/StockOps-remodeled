import { describe, expect, it } from "vitest";
import {
  signWebhookPayload,
  validatePlugin,
  verifyWebhookSignature,
} from "./extensions";

describe("extension utilities", () => {
  it("validates plugin event hooks", () => {
    expect(() =>
      validatePlugin({
        name: "stockops-slack",
        version: "1.0.0",
        hooks: {
          "order.created": async () => undefined,
        },
      }),
    ).not.toThrow();

    expect(() =>
      validatePlugin({
        name: "bad",
        version: "1.0.0",
        hooks: {
          // @ts-expect-error - verifies runtime protection for external plugins.
          "unknown.event": async () => undefined,
        },
      }),
    ).toThrow("Unsupported extension hook");
  });

  it("signs and verifies webhook payloads", () => {
    const payload = JSON.stringify({ event: "order.created", id: "evt_1" });
    const signature = signWebhookPayload(payload, "super-secret");

    expect(verifyWebhookSignature(payload, "super-secret", signature)).toBe(true);
    expect(verifyWebhookSignature(payload, "wrong-secret", signature)).toBe(false);
  });
});
