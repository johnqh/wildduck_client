/**
 * WebSocket Constants
 *
 * Default configuration values and constants for WebSocket client.
 */

/**
 * Default WebSocket configuration values
 */
export const DEFAULT_CONFIG = {
  /** Enable automatic reconnection */
  reconnect: true,

  /** Initial reconnection delay (1 second) */
  reconnectDelay: 1000,

  /** Maximum reconnection delay (32 seconds) */
  maxReconnectDelay: 32000,

  /** Maximum reconnection attempts (0 = unlimited) */
  reconnectAttempts: 0,

  /** Automatically subscribe to channels on connect */
  autoSubscribe: true,

  /** Disable debug logging by default */
  debug: false,

  /** Client-side ping interval (disabled, server handles ping/pong) */
  pingInterval: 0,

  /** Pong timeout (5 seconds) */
  pongTimeout: 5000,
} as const;

/**
 * WebSocket close codes
 * See: https://datatracker.ietf.org/doc/html/rfc6455#section-7.4.1
 */
export const CLOSE_CODES = {
  /** Normal closure */
  NORMAL: 1000,

  /** Going away (e.g., server shutdown, browser navigation) */
  GOING_AWAY: 1001,

  /** Protocol error */
  PROTOCOL_ERROR: 1002,

  /** Unsupported data */
  UNSUPPORTED_DATA: 1003,

  /** No status received */
  NO_STATUS: 1005,

  /** Abnormal closure */
  ABNORMAL: 1006,

  /** Invalid frame payload data */
  INVALID_DATA: 1007,

  /** Policy violation */
  POLICY_VIOLATION: 1008,

  /** Message too big */
  MESSAGE_TOO_BIG: 1009,

  /** Mandatory extension */
  MANDATORY_EXTENSION: 1010,

  /** Internal server error */
  INTERNAL_ERROR: 1011,

  /** Service restart */
  SERVICE_RESTART: 1012,

  /** Try again later */
  TRY_AGAIN_LATER: 1013,

  /** Bad gateway */
  BAD_GATEWAY: 1014,

  /** TLS handshake failure */
  TLS_HANDSHAKE: 1015,
} as const;

/**
 * Custom close codes for application-specific scenarios
 */
export const CUSTOM_CLOSE_CODES = {
  /** User manually disconnected */
  USER_DISCONNECT: 4000,

  /** Token expired */
  TOKEN_EXPIRED: 4001,

  /** Authentication failed */
  AUTH_FAILED: 4002,

  /** Maximum reconnection attempts reached */
  MAX_RECONNECTS: 4003,

  /** Server requested disconnect */
  SERVER_DISCONNECT: 4004,
} as const;

/**
 * Server disconnect reasons (from disconnect messages)
 */
export const DISCONNECT_REASONS = {
  /** Server is shutting down */
  SERVER_SHUTDOWN: "server_shutdown",

  /** Connection timeout (no pong received) */
  TIMEOUT: "timeout",

  /** Access token expired */
  TOKEN_EXPIRED: "token_expired",
} as const;

/**
 * HTTP-like status codes used in WebSocket messages
 */
export const MESSAGE_CODES = {
  /** Success */
  OK: 200,

  /** Bad request */
  BAD_REQUEST: 400,

  /** Unauthorized (invalid/expired token) */
  UNAUTHORIZED: 401,

  /** Forbidden (access denied) */
  FORBIDDEN: 403,

  /** Not found */
  NOT_FOUND: 404,

  /** Internal server error */
  INTERNAL_ERROR: 500,

  /** Service unavailable */
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Reconnection backoff multiplier
 */
export const RECONNECT_BACKOFF_MULTIPLIER = 2;

/**
 * Connection timeout (for initial connect) in milliseconds
 */
export const CONNECTION_TIMEOUT = 10000; // 10 seconds

/**
 * Message timeout (for subscribe/unsubscribe/fetch) in milliseconds
 */
export const MESSAGE_TIMEOUT = 5000; // 5 seconds

/**
 * Cleanup delay for disconnected clients (allow reuse within this window)
 */
export const CLEANUP_DELAY = 5000; // 5 seconds

/**
 * Available channel names
 */
export const CHANNELS = {
  MAILBOXES: "mailboxes",
  MESSAGES: "messages",
  SETTINGS: "settings",
  FILTERS: "filters",
  AUTOREPLY: "autoreply",
} as const;

/**
 * Event names for WebSocket client
 */
export const EVENTS = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
  DATA: "data",
  UPDATE: "update",
  STATE_CHANGE: "stateChange",
} as const;

/**
 * Message types
 */
export const MESSAGE_TYPES = {
  // Client → Server
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
  FETCH: "fetch",

  // Server → Client
  DATA: "data",
  UPDATE: "update",
  DISCONNECT: "disconnect",
} as const;

/**
 * Update event types
 */
export const UPDATE_EVENTS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
} as const;
