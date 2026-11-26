import { describe, expect, it } from "vitest";
import axios, { AxiosError, CanceledError } from "axios";
import { getApiErrorBody, getErrorMessage, isRequestCancelled } from "./apiError";

describe("getApiErrorBody", () => {
  it("should return the response body of an axios error", () => {
    const err = new AxiosError("fail", "ERR_BAD_REQUEST", undefined, undefined, {
      data: { message: "Bad slug" },
      status: 400,
      statusText: "",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    });
    expect(getApiErrorBody(err)).toEqual({ message: "Bad slug" });
  });

  it("should return undefined for a network error with no response", () => {
    expect(getApiErrorBody(new AxiosError("Network Error"))).toBeUndefined();
  });

  it.each([new Error("x"), "x", null, undefined])("should return undefined for non-axios %j", (e) => {
    expect(getApiErrorBody(e)).toBeUndefined();
  });
});

describe("getErrorMessage", () => {
  it("should return an Error's message only", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage("boom")).toBeUndefined();
    expect(getErrorMessage({ message: "fake" })).toBeUndefined();
  });
});

describe("isRequestCancelled", () => {
  it("should detect axios cancellation", () => {
    expect(isRequestCancelled(new CanceledError())).toBe(true);
  });

  it("should detect AbortError and ERR_CANCELED shapes", () => {
    expect(isRequestCancelled(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isRequestCancelled({ code: "ERR_CANCELED" })).toBe(true);
  });

  it.each([new Error("x"), null, undefined, "AbortError", { name: "TypeError" }])("should be false for %j", (e) => {
    expect(isRequestCancelled(e)).toBe(false);
  });
});
