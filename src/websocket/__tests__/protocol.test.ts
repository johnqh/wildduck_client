import { describe, it, expect } from "vitest";
import {
  buildSubscribeMessage,
  buildUnsubscribeMessage,
  buildFetchMessage,
  parseServerMessage,
  serializeClientMessage,
  isErrorMessage,
  isDisconnectMessage,
  isDataMessage,
  isUpdateMessage,
  extractResponseData,
  extractError,
  getDisconnectReason,
  createMockSuccessResponse,
  createMockErrorResponse,
  createMockUpdateMessage,
  createMockDisconnectMessage,
} from "../protocol";
import { MESSAGE_CODES, MESSAGE_TYPES } from "../constants";
import type { ServerMessage } from "../types";

describe("WebSocket Protocol Helpers", () => {
  // ============================================================================
  // Message Builders
  // ============================================================================

  describe("buildSubscribeMessage", () => {
    it("should build a subscribe message with correct structure", () => {
      const msg = buildSubscribeMessage("mailboxes", {
        userId: "user123",
        token: "token456",
      });

      expect(msg.type).toBe("subscribe");
      expect(msg.channel).toBe("mailboxes");
      expect(msg.data).toEqual({ userId: "user123", token: "token456" });
    });

    it("should build subscribe message for messages channel with mailboxId", () => {
      const msg = buildSubscribeMessage("messages", {
        userId: "user123",
        token: "token456",
        mailboxId: "inbox123",
      });

      expect(msg.type).toBe("subscribe");
      expect(msg.channel).toBe("messages");
      expect(msg.data).toEqual({
        userId: "user123",
        token: "token456",
        mailboxId: "inbox123",
      });
    });

    it("should handle all channel names", () => {
      const channels = [
        "mailboxes",
        "messages",
        "settings",
        "filters",
        "autoreply",
      ] as const;

      for (const channel of channels) {
        const msg = buildSubscribeMessage(channel, {
          userId: "u",
          token: "t",
        });
        expect(msg.channel).toBe(channel);
        expect(msg.type).toBe("subscribe");
      }
    });
  });

  describe("buildUnsubscribeMessage", () => {
    it("should build an unsubscribe message", () => {
      const msg = buildUnsubscribeMessage("mailboxes");

      expect(msg.type).toBe("unsubscribe");
      expect(msg.channel).toBe("mailboxes");
      expect(msg.data).toEqual({});
    });

    it("should include optional params when provided", () => {
      const msg = buildUnsubscribeMessage("messages", {
        userId: "user123",
        token: "token456",
      });

      expect(msg.type).toBe("unsubscribe");
      expect(msg.channel).toBe("messages");
      expect(msg.data).toEqual({ userId: "user123", token: "token456" });
    });
  });

  describe("buildFetchMessage", () => {
    it("should build a fetch message with cursor", () => {
      const msg = buildFetchMessage("messages", {
        mailboxId: "inbox123",
        cursor: "cursor-abc",
      });

      expect(msg.type).toBe("fetch");
      expect(msg.channel).toBe("messages");
      expect(msg.data).toEqual({
        mailboxId: "inbox123",
        cursor: "cursor-abc",
      });
    });

    it("should build fetch message with only mailboxId", () => {
      const msg = buildFetchMessage("messages", {
        mailboxId: "inbox123",
      });

      expect(msg.type).toBe("fetch");
      expect(msg.data).toEqual({ mailboxId: "inbox123" });
    });
  });

  // ============================================================================
  // Message Parsing
  // ============================================================================

  describe("parseServerMessage", () => {
    it("should parse valid data message from string", () => {
      const raw = JSON.stringify({
        type: "data",
        channel: "mailboxes",
        data: {
          code: 200,
          response: { success: true, mailboxes: [] },
        },
      });

      const parsed = parseServerMessage(raw);

      expect(parsed.type).toBe("data");
      expect(parsed.channel).toBe("mailboxes");
      expect(parsed.data.code).toBe(200);
      expect(parsed.data.response.success).toBe(true);
    });

    it("should parse valid update message", () => {
      const raw = JSON.stringify({
        type: "update",
        channel: "messages",
        data: {
          code: 200,
          response: { success: true, event: "created" },
        },
      });

      const parsed = parseServerMessage(raw);

      expect(parsed.type).toBe("update");
      expect(parsed.channel).toBe("messages");
    });

    it("should parse valid disconnect message", () => {
      const raw = JSON.stringify({
        type: "disconnect",
        channel: "system",
        data: {
          code: 200,
          response: { success: true, reason: "server_shutdown" },
        },
      });

      const parsed = parseServerMessage(raw);

      expect(parsed.type).toBe("disconnect");
    });

    it("should parse ArrayBuffer data", () => {
      const json = JSON.stringify({
        type: "data",
        channel: "settings",
        data: {
          code: 200,
          response: { success: true },
        },
      });

      const encoder = new TextEncoder();
      const buffer = encoder.encode(json).buffer;

      const parsed = parseServerMessage(buffer);

      expect(parsed.type).toBe("data");
      expect(parsed.channel).toBe("settings");
    });

    it("should throw on invalid JSON", () => {
      expect(() => parseServerMessage("not json")).toThrow(
        "Failed to parse server message",
      );
    });

    it("should throw on missing required fields", () => {
      const raw = JSON.stringify({ type: "data" });

      expect(() => parseServerMessage(raw)).toThrow(
        "Invalid server message structure",
      );
    });

    it("should throw on invalid message type", () => {
      const raw = JSON.stringify({
        type: "unknown",
        channel: "mailboxes",
        data: {
          code: 200,
          response: { success: true },
        },
      });

      expect(() => parseServerMessage(raw)).toThrow(
        "Invalid server message structure",
      );
    });

    it("should throw on missing data.response", () => {
      const raw = JSON.stringify({
        type: "data",
        channel: "mailboxes",
        data: { code: 200 },
      });

      expect(() => parseServerMessage(raw)).toThrow(
        "Invalid server message structure",
      );
    });

    it("should throw on missing data.response.success", () => {
      const raw = JSON.stringify({
        type: "data",
        channel: "mailboxes",
        data: {
          code: 200,
          response: { message: "no success field" },
        },
      });

      expect(() => parseServerMessage(raw)).toThrow(
        "Invalid server message structure",
      );
    });

    it("should throw on Blob data type", () => {
      const blob = new Blob(["test"]);

      expect(() => parseServerMessage(blob as any)).toThrow(
        "Blob data type not supported",
      );
    });
  });

  describe("serializeClientMessage", () => {
    it("should serialize client message to JSON", () => {
      const msg = buildSubscribeMessage("mailboxes", {
        userId: "u",
        token: "t",
      });
      const json = serializeClientMessage(msg);
      const parsed = JSON.parse(json);

      expect(parsed.type).toBe("subscribe");
      expect(parsed.channel).toBe("mailboxes");
      expect(parsed.data.userId).toBe("u");
    });
  });

  // ============================================================================
  // Message Type Checks
  // ============================================================================

  describe("isErrorMessage", () => {
    it("should detect error when success is false", () => {
      const msg: ServerMessage = {
        type: "data",
        channel: "mailboxes",
        data: {
          code: 200,
          response: { success: false, error: "Something went wrong" },
        },
      };

      expect(isErrorMessage(msg)).toBe(true);
    });

    it("should detect error when code >= 400", () => {
      const msg: ServerMessage = {
        type: "data",
        channel: "mailboxes",
        data: {
          code: 404,
          response: { success: false, error: "Not found" },
        },
      };

      expect(isErrorMessage(msg)).toBe(true);
    });

    it("should return false for success messages", () => {
      const msg: ServerMessage = {
        type: "data",
        channel: "mailboxes",
        data: {
          code: 200,
          response: { success: true },
        },
      };

      expect(isErrorMessage(msg)).toBe(false);
    });
  });

  describe("isDisconnectMessage", () => {
    it("should detect disconnect messages", () => {
      const msg = createMockDisconnectMessage("server_shutdown");

      expect(isDisconnectMessage(msg)).toBe(true);
    });

    it("should return false for non-disconnect messages", () => {
      const msg = createMockSuccessResponse("mailboxes", {});

      expect(isDisconnectMessage(msg)).toBe(false);
    });
  });

  describe("isDataMessage", () => {
    it("should detect data messages", () => {
      const msg = createMockSuccessResponse("mailboxes", {});

      expect(isDataMessage(msg)).toBe(true);
    });

    it("should return false for update messages", () => {
      const msg = createMockUpdateMessage("mailboxes", {});

      expect(isDataMessage(msg)).toBe(false);
    });
  });

  describe("isUpdateMessage", () => {
    it("should detect update messages", () => {
      const msg = createMockUpdateMessage("messages", {
        event: "created",
      });

      expect(isUpdateMessage(msg)).toBe(true);
    });

    it("should return false for data messages", () => {
      const msg = createMockSuccessResponse("messages", {});

      expect(isUpdateMessage(msg)).toBe(false);
    });
  });

  // ============================================================================
  // Data Extraction
  // ============================================================================

  describe("extractResponseData", () => {
    it("should extract response data from message", () => {
      const msg = createMockSuccessResponse("mailboxes", {
        mailboxes: [{ id: "inbox" }],
      });

      const data = extractResponseData(msg);

      expect(data.success).toBe(true);
      expect((data as any).mailboxes).toEqual([{ id: "inbox" }]);
    });
  });

  describe("extractError", () => {
    it("should extract error from error message", () => {
      const msg = createMockErrorResponse(
        "mailboxes",
        404,
        "NotFoundError",
        "Mailbox not found",
      );

      const error = extractError(msg);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("NotFoundError");
      expect(error.message).toContain("Mailbox not found");
      expect((error as any).code).toBe(404);
      expect((error as any).errorName).toBe("NotFoundError");
    });

    it("should handle missing error details", () => {
      const msg: ServerMessage = {
        type: "data",
        channel: "mailboxes",
        data: {
          code: 500,
          response: { success: false },
        },
      };

      const error = extractError(msg);

      expect(error).toBeInstanceOf(Error);
      expect((error as any).code).toBe(500);
    });
  });

  describe("getDisconnectReason", () => {
    it("should extract disconnect reason", () => {
      const msg = createMockDisconnectMessage("token_expired");

      const reason = getDisconnectReason(msg);

      expect(reason).toBe("token_expired");
    });

    it("should return unknown for non-disconnect messages", () => {
      const msg = createMockSuccessResponse("mailboxes", {});

      const reason = getDisconnectReason(msg);

      expect(reason).toBe("unknown");
    });
  });

  // ============================================================================
  // Mock Message Factories
  // ============================================================================

  describe("createMockSuccessResponse", () => {
    it("should create a valid success response", () => {
      const msg = createMockSuccessResponse("mailboxes", {
        mailboxes: [],
      });

      expect(msg.type).toBe(MESSAGE_TYPES.DATA);
      expect(msg.channel).toBe("mailboxes");
      expect(msg.data.code).toBe(MESSAGE_CODES.OK);
      expect(msg.data.response.success).toBe(true);
      expect((msg.data.response as any).mailboxes).toEqual([]);
    });
  });

  describe("createMockErrorResponse", () => {
    it("should create a valid error response", () => {
      const msg = createMockErrorResponse(
        "messages",
        401,
        "UnauthorizedError",
        "Token expired",
      );

      expect(msg.type).toBe(MESSAGE_TYPES.DATA);
      expect(msg.channel).toBe("messages");
      expect(msg.data.code).toBe(401);
      expect(msg.data.response.success).toBe(false);
      expect(msg.data.response.error).toBe("UnauthorizedError");
      expect(msg.data.response.message).toBe("Token expired");
    });
  });

  describe("createMockUpdateMessage", () => {
    it("should create a valid update message", () => {
      const msg = createMockUpdateMessage("messages", {
        event: "created",
        message: { id: 1, subject: "New" },
      });

      expect(msg.type).toBe(MESSAGE_TYPES.UPDATE);
      expect(msg.channel).toBe("messages");
      expect(msg.data.code).toBe(MESSAGE_CODES.OK);
      expect(msg.data.response.success).toBe(true);
      expect((msg.data.response as any).event).toBe("created");
    });
  });

  describe("createMockDisconnectMessage", () => {
    it("should create a valid disconnect message", () => {
      const msg = createMockDisconnectMessage("server_shutdown");

      expect(msg.type).toBe(MESSAGE_TYPES.DISCONNECT);
      expect(msg.channel).toBe("system");
      expect(msg.data.response.success).toBe(true);
      expect((msg.data.response as any).reason).toBe("server_shutdown");
    });
  });
});
