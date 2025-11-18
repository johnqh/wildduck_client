/**
 * WebSocket Protocol Helpers
 *
 * Utilities for building and parsing WebSocket protocol messages.
 */

import type {
  ClientMessage,
  ServerMessage,
  ChannelName,
  ClientMessageType,
  SubscriptionParams,
  FetchParams,
  ServerResponseData,
} from "./types";
import { MESSAGE_TYPES, MESSAGE_CODES } from "./constants";

/**
 * Build a subscribe message
 *
 * @param channel - Channel name
 * @param params - Subscription parameters
 * @returns Client message object
 */
export function buildSubscribeMessage(
  channel: ChannelName,
  params: SubscriptionParams
): ClientMessage {
  return {
    type: MESSAGE_TYPES.SUBSCRIBE as ClientMessageType,
    channel,
    data: params,
  };
}

/**
 * Build an unsubscribe message
 *
 * @param channel - Channel name
 * @returns Client message object
 */
export function buildUnsubscribeMessage(channel: ChannelName): ClientMessage {
  return {
    type: MESSAGE_TYPES.UNSUBSCRIBE as ClientMessageType,
    channel,
    data: {},
  };
}

/**
 * Build a fetch message (for pagination)
 *
 * @param channel - Channel name
 * @param params - Fetch parameters
 * @returns Client message object
 */
export function buildFetchMessage(
  channel: ChannelName,
  params: FetchParams
): ClientMessage {
  return {
    type: MESSAGE_TYPES.FETCH as ClientMessageType,
    channel,
    data: params,
  };
}

/**
 * Parse a server message from JSON string
 *
 * @param data - Raw message data (string, ArrayBuffer, or Blob)
 * @returns Parsed server message
 * @throws Error if message is invalid JSON
 */
export function parseServerMessage(
  data: string | ArrayBuffer | Blob
): ServerMessage {
  // Convert to string if needed
  let jsonString: string;

  if (typeof data === "string") {
    jsonString = data;
  } else if (data instanceof ArrayBuffer) {
    // React Native or browser ArrayBuffer
    const decoder = new TextDecoder("utf-8");
    jsonString = decoder.decode(data);
  } else {
    // Blob (browser only, but handle it)
    throw new Error("Blob data type not supported. Server should send text messages.");
  }

  try {
    const parsed = JSON.parse(jsonString);

    // Validate message structure
    if (!isValidServerMessage(parsed)) {
      throw new Error("Invalid server message structure");
    }

    return parsed as ServerMessage;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse server message: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate server message structure
 *
 * @param obj - Object to validate
 * @returns True if valid server message
 */
function isValidServerMessage(obj: any): obj is ServerMessage {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  // Check required fields
  if (
    typeof obj.type !== "string" ||
    typeof obj.channel !== "string" ||
    typeof obj.data !== "object" ||
    obj.data === null
  ) {
    return false;
  }

  // Validate message type
  const validTypes = [
    MESSAGE_TYPES.DATA,
    MESSAGE_TYPES.UPDATE,
    MESSAGE_TYPES.DISCONNECT,
  ];
  if (!validTypes.includes(obj.type)) {
    return false;
  }

  // Validate data structure
  if (
    typeof obj.data.code !== "number" ||
    typeof obj.data.response !== "object" ||
    obj.data.response === null
  ) {
    return false;
  }

  // Validate response structure
  if (typeof obj.data.response.success !== "boolean") {
    return false;
  }

  return true;
}

/**
 * Check if server message is an error
 *
 * @param message - Server message
 * @returns True if message represents an error
 */
export function isErrorMessage(message: ServerMessage): boolean {
  return (
    !message.data.response.success ||
    message.data.code >= MESSAGE_CODES.BAD_REQUEST
  );
}

/**
 * Check if server message is a disconnect notification
 *
 * @param message - Server message
 * @returns True if message is a disconnect notification
 */
export function isDisconnectMessage(message: ServerMessage): boolean {
  return message.type === MESSAGE_TYPES.DISCONNECT;
}

/**
 * Check if server message is initial data (subscribe response)
 *
 * @param message - Server message
 * @returns True if message is initial data
 */
export function isDataMessage(message: ServerMessage): boolean {
  return message.type === MESSAGE_TYPES.DATA;
}

/**
 * Check if server message is a real-time update
 *
 * @param message - Server message
 * @returns True if message is an update
 */
export function isUpdateMessage(message: ServerMessage): boolean {
  return message.type === MESSAGE_TYPES.UPDATE;
}

/**
 * Extract response data from server message
 *
 * @param message - Server message
 * @returns Response data
 */
export function extractResponseData(
  message: ServerMessage
): ServerResponseData {
  return message.data.response;
}

/**
 * Extract error information from error message
 *
 * @param message - Server message (error)
 * @returns Error object
 */
export function extractError(message: ServerMessage): Error {
  const response = message.data.response;
  const code = message.data.code;
  const errorName = response.error || "Unknown Error";
  const errorMessage =
    response.message || `WebSocket error (code: ${code})`;

  const error = new Error(`${errorName}: ${errorMessage}`);
  (error as any).code = code;
  (error as any).errorName = errorName;

  return error;
}

/**
 * Serialize client message to JSON string
 *
 * @param message - Client message
 * @returns JSON string
 */
export function serializeClientMessage(message: ClientMessage): string {
  return JSON.stringify(message);
}

/**
 * Get disconnect reason from disconnect message
 *
 * @param message - Disconnect message
 * @returns Disconnect reason
 */
export function getDisconnectReason(message: ServerMessage): string {
  if (!isDisconnectMessage(message)) {
    return "unknown";
  }

  return (message.data.response as any).reason || "unknown";
}

/**
 * Create a mock success response for testing
 *
 * @param channel - Channel name
 * @param data - Response data
 * @returns Server message
 */
export function createMockSuccessResponse(
  channel: ChannelName,
  data: Record<string, any>
): ServerMessage {
  return {
    type: MESSAGE_TYPES.DATA,
    channel,
    data: {
      code: MESSAGE_CODES.OK,
      response: {
        success: true,
        ...data,
      },
    },
  };
}

/**
 * Create a mock error response for testing
 *
 * @param channel - Channel name
 * @param code - HTTP status code
 * @param error - Error name
 * @param message - Error message
 * @returns Server message
 */
export function createMockErrorResponse(
  channel: ChannelName,
  code: number,
  error: string,
  message: string
): ServerMessage {
  return {
    type: MESSAGE_TYPES.DATA,
    channel,
    data: {
      code,
      response: {
        success: false,
        error,
        message,
      },
    },
  };
}

/**
 * Create a mock update message for testing
 *
 * @param channel - Channel name
 * @param data - Update data
 * @returns Server message
 */
export function createMockUpdateMessage(
  channel: ChannelName,
  data: Record<string, any>
): ServerMessage {
  return {
    type: MESSAGE_TYPES.UPDATE,
    channel,
    data: {
      code: MESSAGE_CODES.OK,
      response: {
        success: true,
        ...data,
      },
    },
  };
}

/**
 * Create a mock disconnect message for testing
 *
 * @param reason - Disconnect reason
 * @returns Server message
 */
export function createMockDisconnectMessage(reason: string): ServerMessage {
  return {
    type: MESSAGE_TYPES.DISCONNECT,
    channel: "system",
    data: {
      code: MESSAGE_CODES.OK,
      response: {
        success: true,
        reason,
      },
    },
  };
}
