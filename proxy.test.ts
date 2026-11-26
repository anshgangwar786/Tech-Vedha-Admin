import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import proxy from "./proxy";

const SECRET = "test-jwt-secret";

function request(path: string, token?: string) {
  return new NextRequest(`https://admin.example.com${path}`, {
    headers: token ? { cookie: `authToken=${token}` } : {},
  });
}

const validToken = () => jwt.sign({ id: "u1", username: "alice", role: "admin", pwv: "abc123" }, SECRET);
const location = (res: Response) => res.headers.get("location");

describe("proxy (route guard)", () => {
  describe("signed out", () => {
    it.each(["/login", "/forgot-password"])("should let %s through", (path) => {
      const res = proxy(request(path));
      expect(location(res)).toBeNull();
      expect(res.headers.get("x-middleware-next")).toBe("1");
    });

    it.each(["/dashboard", "/dashboard/users", "/", "/signup"])("should redirect %s to /login", (path) => {
      expect(location(proxy(request(path)))).toBe("https://admin.example.com/login");
    });
  });

  describe("signed in", () => {
    it.each(["/login", "/forgot-password", "/signup"])("should redirect %s to /dashboard", (path) => {
      expect(location(proxy(request(path, validToken())))).toBe("https://admin.example.com/dashboard");
    });

    it("should forward the user's identity as request headers on protected pages", () => {
      // Act
      const res = proxy(request("/dashboard", validToken()));

      // Assert
      expect(location(res)).toBeNull();
      expect(res.headers.get("x-middleware-request-x-user-id")).toBe("u1");
      expect(res.headers.get("x-middleware-request-x-username")).toBe("alice");
      expect(res.headers.get("x-middleware-request-x-user-role")).toBe("admin");
    });

    it("should sign out and clear cookies when the token has no password version", () => {
      const token = jwt.sign({ id: "u1", username: "alice", role: "admin" }, SECRET);

      const res = proxy(request("/dashboard", token));

      expect(location(res)).toBe("https://admin.example.com/login");
      expect(res.cookies.get("authToken")?.value).toBe("");
      expect(res.cookies.get("loggedIn")?.value).toBe("");
      expect(res.cookies.get("sessionEndsAt")?.value).toBe("");
    });

    it("should redirect to /login when the token signature is invalid", () => {
      const forged = jwt.sign({ id: "u1", username: "x", role: "superadmin", pwv: "a" }, "wrong-secret");
      expect(location(proxy(request("/dashboard", forged)))).toBe("https://admin.example.com/login");
    });

    it("should redirect to /login when the token is expired", () => {
      const expired = jwt.sign({ id: "u1", username: "a", role: "a", pwv: "a", exp: Math.floor(Date.now() / 1000) - 1 }, SECRET);
      expect(location(proxy(request("/dashboard", expired)))).toBe("https://admin.example.com/login");
    });

    it("should redirect to /login when the token uses a non-HS256 algorithm", () => {
      const hs512 = jwt.sign({ id: "u1", username: "a", role: "a", pwv: "a" }, SECRET, { algorithm: "HS512" });
      expect(location(proxy(request("/dashboard", hs512)))).toBe("https://admin.example.com/login");
    });
  });
});
