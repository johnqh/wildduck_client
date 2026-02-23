import { describe, it, expect } from "vitest";
import {
  queryKeys,
  createQueryKey,
  getServiceKeys,
} from "../query-keys";

describe("Query Keys Factory", () => {
  describe("queryKeys.wildduck", () => {
    it("should produce base key", () => {
      const key = queryKeys.wildduck.all();
      expect(key).toEqual(["wildduck"]);
    });

    it("should produce health key", () => {
      const key = queryKeys.wildduck.health();
      expect(key).toEqual(["wildduck", "health"]);
    });

    it("should produce users keys", () => {
      expect(queryKeys.wildduck.users()).toEqual(["wildduck", "users"]);
      expect(queryKeys.wildduck.usersList({ limit: 10 })).toEqual([
        "wildduck",
        "users",
        "list",
        { limit: 10 },
      ]);
      expect(queryKeys.wildduck.user("user123")).toEqual([
        "wildduck",
        "users",
        "user123",
      ]);
    });

    it("should produce address keys", () => {
      expect(queryKeys.wildduck.addresses()).toEqual([
        "wildduck",
        "addresses",
      ]);
      expect(queryKeys.wildduck.userAddresses("user123")).toEqual([
        "wildduck",
        "addresses",
        "user123",
      ]);
      expect(queryKeys.wildduck.forwardedAddresses("user123")).toEqual([
        "wildduck",
        "addresses",
        "forwarded",
        "user123",
      ]);
      expect(queryKeys.wildduck.resolveAddress("test@example.com")).toEqual([
        "wildduck",
        "addresses",
        "resolve",
        "test@example.com",
      ]);
    });

    it("should produce mailbox keys", () => {
      expect(queryKeys.wildduck.mailboxes()).toEqual([
        "wildduck",
        "mailboxes",
      ]);
      expect(queryKeys.wildduck.userMailboxes("user123")).toEqual([
        "wildduck",
        "mailboxes",
        "user123",
        undefined,
      ]);
      expect(
        queryKeys.wildduck.userMailboxes("user123", { counters: true }),
      ).toEqual(["wildduck", "mailboxes", "user123", { counters: true }]);
    });

    it("should produce message keys", () => {
      expect(queryKeys.wildduck.messages()).toEqual(["wildduck", "messages"]);
      expect(
        queryKeys.wildduck.userMessages("user123", "mailbox456"),
      ).toEqual([
        "wildduck",
        "messages",
        "user123",
        "mailbox456",
        undefined,
      ]);
      expect(
        queryKeys.wildduck.message("user123", "mailbox456", "msg789"),
      ).toEqual(["wildduck", "messages", "user123", "mailbox456", "msg789"]);
    });

    it("should produce search message keys", () => {
      const key = queryKeys.wildduck.searchMessages(
        "user123",
        "mailbox456",
        "test query",
        { from: "sender@test.com" },
      );
      expect(key).toEqual([
        "wildduck",
        "messages",
        "search",
        "user123",
        "mailbox456",
        { query: "test query", from: "sender@test.com" },
      ]);
    });

    it("should produce filter keys", () => {
      expect(queryKeys.wildduck.filters()).toEqual(["wildduck", "filters"]);
      expect(queryKeys.wildduck.userFilters("user123")).toEqual([
        "wildduck",
        "filters",
        "user123",
      ]);
    });

    it("should produce settings keys", () => {
      expect(queryKeys.wildduck.settings()).toEqual(["wildduck", "settings"]);
      expect(queryKeys.wildduck.userSettings("user123")).toEqual([
        "wildduck",
        "settings",
        "user123",
      ]);
    });

    it("should produce auth keys", () => {
      expect(queryKeys.wildduck.auth()).toEqual(["wildduck", "auth"]);
      expect(queryKeys.wildduck.authStatus("token123")).toEqual([
        "wildduck",
        "auth",
        "status",
        "token123",
      ]);
    });
  });

  describe("createQueryKey", () => {
    it("should create custom query keys", () => {
      const key = createQueryKey("custom-service", "part1", "part2");
      expect(key).toEqual(["custom-service", "part1", "part2"]);
    });

    it("should handle object parts", () => {
      const key = createQueryKey("service", "list", { page: 1 });
      expect(key).toEqual(["service", "list", { page: 1 }]);
    });
  });

  describe("getServiceKeys", () => {
    it("should return the base wildduck key", () => {
      const key = getServiceKeys();
      expect(key).toEqual(["wildduck"]);
    });
  });
});
