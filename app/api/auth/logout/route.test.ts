import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("should expire the auth, logged-in and session-end cookies", async () => {
    const res = await POST();

    expect(res.status).toBe(200);
    for (const name of ["authToken", "loggedIn", "sessionEndsAt"]) {
      const cookie = res.cookies.get(name);
      expect(cookie?.value).toBe("");
      expect(cookie?.expires).toEqual(new Date(0));
      expect(cookie).toMatchObject({ path: "/", sameSite: "strict" });
    }
    expect(res.cookies.get("authToken")?.httpOnly).toBe(true);
  });
});
