import { describe, expect, it } from "vitest";
import { authenticateDemoUser } from "@/lib/demo-store";

describe("demo authentication", () => {
  it("accepts seeded demo credentials", () => {
    const context = authenticateDemoUser("eren@example.com", "stockops123");

    expect(context?.user.email).toBe("eren@example.com");
    expect(context?.role).toBe("Owner");
  });

  it("rejects invalid demo credentials", () => {
    expect(authenticateDemoUser("eren@example.com", "wrong-password")).toBeNull();
  });
});
