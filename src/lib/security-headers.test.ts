import { describe, expect, it } from "vitest";
import nextConfig, { SECURITY_HEADERS } from "../../next.config";

describe("security response headers", () => {
  it("applies the required browser hardening headers to every route", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const rules = await nextConfig.headers!();

    expect(rules).toEqual([
      {
        source: "/(.*)",
        headers: [...SECURITY_HEADERS],
      },
    ]);
    expect(Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]))).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    expect(SECURITY_HEADERS[0].value).toContain("frame-ancestors 'none'");
    expect(SECURITY_HEADERS[0].value).toContain("object-src 'none'");
  });
});
