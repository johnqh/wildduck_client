/**
 * WildDuck WebSocket Client
 *
 * Optional WebSocket support for real-time updates.
 * @module @sudobility/wildduck-client/websocket
 */

// Export main client
export { WildduckWebSocketClient } from "./client";

// Export React provider and hooks
export { WebSocketProvider, useWebSocketContext } from "./provider";
export type { WebSocketContextValue, WebSocketProviderProps } from "./provider";
export { useWebSocket } from "./useWebSocket";

// Export types
export type {
  WebSocketConfig,
  WebSocketReadyState,
  ConnectionState,
  ChannelName,
  ClientMessageType,
  ServerMessageType,
  SubscriptionParams,
  MailboxesSubscriptionParams,
  MessagesSubscriptionParams,
  SettingsSubscriptionParams,
  FiltersSubscriptionParams,
  AutoReplySubscriptionParams,
  FetchParams,
  ClientMessage,
  ServerMessage,
  ServerResponseData,
  SubscriptionResponse,
  FetchResponse,
  UpdateEventData,
  SubscriptionState,
  WebSocketEventMap,
  EventListener,
  IWebSocketClient,
  ReconnectionOptions,
} from "./types";

// Export constants
export {
  DEFAULT_CONFIG,
  CLOSE_CODES,
  CUSTOM_CLOSE_CODES,
  DISCONNECT_REASONS,
  MESSAGE_CODES,
  CHANNELS,
  EVENTS,
  MESSAGE_TYPES,
  UPDATE_EVENTS,
} from "./constants";

// Export protocol helpers (useful for testing)
export {
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
} from "./protocol";
