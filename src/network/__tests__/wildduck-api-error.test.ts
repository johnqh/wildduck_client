import { describe, it, expect } from "vitest";
import { WildduckApiError } from "../wildduck-api-error";

describe("WildduckApiError", () => {
  describe("constructor", () => {
    it("should create error with message, statusCode, and errorCode", () => {
      const error = new WildduckApiError("Not found", 404, "UserNotFoundError");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(WildduckApiError);
      expect(error.message).toBe("Not found");
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe("UserNotFoundError");
      expect(error.name).toBe("WildduckApiError");
    });

    it("should default errorCode to UnknownError", () => {
      const error = new WildduckApiError("Something went wrong", 500);

      expect(error.errorCode).toBe("UnknownError");
    });
  });

  describe("isNotFound", () => {
    it("should return true for 404", () => {
      const error = new WildduckApiError("Not found", 404);
      expect(error.isNotFound).toBe(true);
    });

    it("should return false for non-404", () => {
      const error = new WildduckApiError("Error", 400);
      expect(error.isNotFound).toBe(false);
    });
  });

  describe("isUnauthorized", () => {
    it("should return true for 401", () => {
      const error = new WildduckApiError("Unauthorized", 401);
      expect(error.isUnauthorized).toBe(true);
    });

    it("should return false for non-401", () => {
      const error = new WildduckApiError("Error", 403);
      expect(error.isUnauthorized).toBe(false);
    });
  });

  describe("isForbidden", () => {
    it("should return true for 403", () => {
      const error = new WildduckApiError("Forbidden", 403);
      expect(error.isForbidden).toBe(true);
    });

    it("should return false for non-403", () => {
      const error = new WildduckApiError("Error", 401);
      expect(error.isForbidden).toBe(false);
    });
  });

  describe("isRateLimited", () => {
    it("should return true for 429", () => {
      const error = new WildduckApiError("Rate limited", 429);
      expect(error.isRateLimited).toBe(true);
    });

    it("should return false for non-429", () => {
      const error = new WildduckApiError("Error", 500);
      expect(error.isRateLimited).toBe(false);
    });
  });

  describe("isValidationError", () => {
    it("should return true for 400", () => {
      const error = new WildduckApiError("Bad request", 400, "ValidationError");
      expect(error.isValidationError).toBe(true);
    });

    it("should return false for non-400", () => {
      const error = new WildduckApiError("Error", 404);
      expect(error.isValidationError).toBe(false);
    });
  });

  describe("isServerError", () => {
    it("should return true for 500", () => {
      const error = new WildduckApiError("Internal error", 500);
      expect(error.isServerError).toBe(true);
    });

    it("should return true for 503", () => {
      const error = new WildduckApiError("Unavailable", 503);
      expect(error.isServerError).toBe(true);
    });

    it("should return false for 4xx", () => {
      const error = new WildduckApiError("Client error", 400);
      expect(error.isServerError).toBe(false);
    });

    it("should return false for 2xx", () => {
      const error = new WildduckApiError("Success?", 200);
      expect(error.isServerError).toBe(false);
    });
  });

  describe("instanceof checks", () => {
    it("should be caught by Error catch blocks", () => {
      const error = new WildduckApiError("Test", 500);

      let caught = false;
      try {
        throw error;
      } catch (e) {
        if (e instanceof Error) {
          caught = true;
          expect(e.message).toBe("Test");
        }
      }
      expect(caught).toBe(true);
    });

    it("should be distinguishable from plain Error", () => {
      const apiError = new WildduckApiError("API error", 500);
      const plainError = new Error("Plain error");

      expect(apiError instanceof WildduckApiError).toBe(true);
      expect(plainError instanceof WildduckApiError).toBe(false);
    });
  });
});
