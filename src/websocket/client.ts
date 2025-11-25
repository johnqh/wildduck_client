/**
 * Wildduck WebSocket Client
 *
 * Low-level WebSocket client for WildDuck server with automatic reconnection,
 * subscription management, and event-driven communication.
 */

import type {
  ChannelName,
  ConnectionState,
  EventListener,
  FetchParams,
  FetchResponse,
  IWebSocketClient,
  ServerMessage,
  ServerResponseData,
  SubscriptionParams,
  SubscriptionResponse,
  SubscriptionState,
  WebSocketConfig,
  WebSocketEventMap,
  WebSocketReadyState,
} from "./types";

import {
  CLOSE_CODES,
  CONNECTION_TIMEOUT,
  CUSTOM_CLOSE_CODES,
  DEFAULT_CONFIG,
  EVENTS,
  MESSAGE_TIMEOUT,
  RECONNECT_BACKOFF_MULTIPLIER,
} from "./constants";

import {
  buildFetchMessage,
  buildSubscribeMessage,
  buildUnsubscribeMessage,
  extractError,
  extractResponseData,
  getDisconnectReason,
  isDataMessage,
  isDisconnectMessage,
  isErrorMessage,
  isUpdateMessage,
  parseServerMessage,
  serializeClientMessage,
} from "./protocol";

import type { TimerHandle } from "./types";

/**
 * Pending request state for tracking in-flight requests
 */
interface PendingRequest {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timeout: TimerHandle;
}

/**
 * WildduckWebSocketClient
 *
 * Manages WebSocket connection lifecycle, subscriptions, and protocol communication.
 */
export class WildduckWebSocketClient implements IWebSocketClient {
  private config: Required<WebSocketConfig>;
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = "disconnected";
  private auth: { userId: string; accessToken: string } | null = null;

  // Subscription tracking
  private subscriptionMap = new Map<ChannelName, SubscriptionState>();

  // Event listeners
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private listeners = new Map<keyof WebSocketEventMap, Set<Function>>();

  // Reconnection state
  private _reconnectAttempt = 0;
  private reconnectTimer: TimerHandle | null = null;
  private _isReconnecting = false;

  // Pending requests (waiting for server response)
  private pendingRequests = new Map<string, PendingRequest>();

  // Connection timeout
  private connectTimeout: TimerHandle | null = null;

  /**
   * Create a new WebSocket client
   *
   * @param config - WebSocket configuration
   */
  constructor(config: WebSocketConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.debug("Client created", this.config);
  }

  /**
   * Get current connection state
   */
  get state(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get current WebSocket ready state
   */
  get readyState(): WebSocketReadyState {
    if (!this.ws) {
      return 3; // CLOSED
    }
    return this.ws.readyState as WebSocketReadyState;
  }

  /**
   * Check if client is connected
   */
  get isConnected(): boolean {
    return this.connectionState === "connected";
  }

  /**
   * Check if client is reconnecting
   */
  get isReconnecting(): boolean {
    return this._isReconnecting;
  }

  /**
   * Get current reconnection attempt number
   */
  get reconnectAttempt(): number {
    return this._reconnectAttempt;
  }

  /**
   * Get active subscriptions (readonly)
   */
  get subscriptions(): ReadonlyMap<ChannelName, SubscriptionState> {
    return this.subscriptionMap;
  }

  /**
   * Connect to WebSocket server
   *
   * @param auth - User authentication data
   * @throws Error if already connected or connecting
   */
  async connect(auth: { userId: string; accessToken: string }): Promise<void> {
    if (this.connectionState === "connected") {
      this.debug("Already connected");
      return;
    }

    if (this.connectionState === "connecting") {
      throw new Error("Connection already in progress");
    }

    this.auth = auth;
    this.updateState("connecting");

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        this.ws = new WebSocket(this.config.url);

        // Set up connection timeout
        this.connectTimeout = setTimeout(() => {
          this.handleConnectionTimeout(reject);
        }, CONNECTION_TIMEOUT);

        // WebSocket event handlers
        this.ws.addEventListener("open", () => {
          this.handleOpen(resolve);
        });

        this.ws.addEventListener("close", (event) => {
          this.handleClose(event.code, event.reason);
        });

        this.ws.addEventListener("error", () => {
          this.handleError(new Error("WebSocket error"), reject);
        });

        this.ws.addEventListener("message", (event) => {
          this.handleMessage(event.data);
        });
      } catch (error) {
        this.updateState("disconnected");
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to create WebSocket"),
        );
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   *
   * @param code - Close code
   * @param reason - Close reason
   */
  disconnect(
    code: number = CLOSE_CODES.NORMAL,
    reason: string = "Client disconnect",
  ): void {
    this.debug("Disconnecting", { code, reason });

    // Cancel reconnection
    this.cancelReconnect();

    // Update state
    this.updateState("disconnecting");

    // Close WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(code, reason);
    }

    // Clean up
    this.cleanup();

    // Update state
    this.updateState("disconnected");
  }

  /**
   * Subscribe to a channel
   *
   * @param channel - Channel name
   * @param params - Subscription parameters
   * @returns Promise resolving to subscription response
   */
  async subscribe(
    channel: ChannelName,
    params: SubscriptionParams,
  ): Promise<SubscriptionResponse> {
    if (!this.isConnected) {
      throw new Error("Not connected to WebSocket server");
    }

    // Check if already subscribed
    if (this.subscriptionMap.has(channel)) {
      this.debug(`Already subscribed to ${channel}`);
      // Return cached subscription - just send subscribe again to get fresh data
    }

    // Build subscribe message
    const message = buildSubscribeMessage(channel, params);

    // Send message and wait for response
    const response = await this.sendMessageAndWait<SubscriptionResponse>(
      message,
      channel,
    );

    // Track subscription
    this.subscriptionMap.set(channel, {
      channel,
      params,
      active: true,
      subscribedAt: Date.now(),
    });

    this.debug(`Subscribed to ${channel}`, response);

    return response;
  }

  /**
   * Unsubscribe from a channel
   *
   * @param channel - Channel name
   */
  async unsubscribe(channel: ChannelName): Promise<void> {
    const subscription = this.subscriptionMap.get(channel);
    if (!subscription) {
      this.debug(`Not subscribed to ${channel}`);
      return;
    }

    // Build unsubscribe message
    const message = buildUnsubscribeMessage(channel, subscription.params);

    // Send message (don't wait for response)
    if (this.isConnected && this.ws) {
      this.ws.send(serializeClientMessage(message));
    }

    // Remove subscription
    this.subscriptionMap.delete(channel);

    this.debug(`Unsubscribed from ${channel}`);
  }

  /**
   * Fetch more data (pagination)
   *
   * @param channel - Channel name
   * @param params - Fetch parameters
   * @returns Promise resolving to fetch response
   */
  async fetch(
    channel: ChannelName,
    params: FetchParams,
  ): Promise<FetchResponse> {
    if (!this.isConnected) {
      throw new Error("Not connected to WebSocket server");
    }

    // Build fetch message
    const message = buildFetchMessage(channel, params);

    // Send message and wait for response
    const response = await this.sendMessageAndWait<FetchResponse>(
      message,
      channel,
    );

    this.debug(`Fetched data from ${channel}`, response);

    return response;
  }

  /**
   * Add event listener
   *
   * @param event - Event name
   * @param listener - Event listener
   */
  on<T extends keyof WebSocketEventMap>(
    event: T,
    listener: EventListener<T>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-function-type
    this.listeners.get(event)!.add(listener as Function);
  }

  /**
   * Remove event listener
   *
   * @param event - Event name
   * @param listener - Event listener
   */
  off<T extends keyof WebSocketEventMap>(
    event: T,
    listener: EventListener<T>,
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      eventListeners.delete(listener as Function);
    }
  }

  /**
   * Remove all event listeners for an event
   *
   * @param event - Event name (optional)
   */
  removeAllListeners(event?: keyof WebSocketEventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(resolve: (value: void) => void): void {
    this.debug("WebSocket opened");

    // Clear connection timeout
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    // Reset reconnection state
    this._reconnectAttempt = 0;
    this._isReconnecting = false;

    // Update state
    this.updateState("connected");

    // Emit connected event
    this.emit(EVENTS.CONNECTED);

    // Resolve connection promise
    resolve();

    // Auto-resubscribe to previous channels if reconnecting
    if (this.config.autoSubscribe && this.subscriptionMap.size > 0) {
      this.resubscribeAll();
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(code: number, reason: string): void {
    this.debug("WebSocket closed", { code, reason });

    // Clean up
    this.cleanup();

    // Emit disconnected event
    this.emit(EVENTS.DISCONNECTED, code, reason);

    // Determine if we should reconnect
    const shouldReconnect =
      this.config.reconnect &&
      this.connectionState !== "disconnecting" &&
      code !== CLOSE_CODES.NORMAL &&
      code !== CUSTOM_CLOSE_CODES.USER_DISCONNECT;

    if (shouldReconnect) {
      this.attemptReconnect();
    } else {
      this.updateState("disconnected");
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Error, reject?: (error: Error) => void): void {
    this.debug("WebSocket error", error);

    // Emit error event
    this.emit(EVENTS.ERROR, error);

    // Reject connection promise if connecting
    if (reject && this.connectionState === "connecting") {
      reject(error);
    }
  }

  /**
   * Handle connection timeout
   */
  private handleConnectionTimeout(reject: (error: Error) => void): void {
    this.debug("Connection timeout");

    const error = new Error("WebSocket connection timeout");

    // Close WebSocket
    if (this.ws) {
      this.ws.close(CLOSE_CODES.ABNORMAL, "Connection timeout");
    }

    // Clean up
    this.cleanup();

    // Update state
    this.updateState("disconnected");

    // Emit error event
    this.emit(EVENTS.ERROR, error);

    // Reject connection promise
    reject(error);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string | ArrayBuffer | Blob): void {
    try {
      const message = parseServerMessage(data);

      this.debug("Received message", message);

      // Handle disconnect messages
      if (isDisconnectMessage(message)) {
        const reason = getDisconnectReason(message);
        this.disconnect(
          CUSTOM_CLOSE_CODES.SERVER_DISCONNECT,
          `Server disconnect: ${reason}`,
        );
        return;
      }

      // Handle error messages
      if (isErrorMessage(message)) {
        this.handleErrorMessage(message);
        return;
      }

      // Handle data messages (subscribe/fetch responses)
      if (isDataMessage(message)) {
        this.handleDataMessage(message);
      }

      // Handle update messages
      if (isUpdateMessage(message)) {
        this.handleUpdateMessage(message);
      }
    } catch (error) {
      this.debug("Failed to handle message", error);
      this.emit(
        EVENTS.ERROR,
        error instanceof Error ? error : new Error("Message handling failed"),
      );
    }
  }

  /**
   * Handle error message from server
   */
  private handleErrorMessage(message: ServerMessage): void {
    const error = extractError(message);
    const channel = message.channel as ChannelName;
    const requestKey = this.getRequestKey(channel);

    // Reject pending request if exists
    const pending = this.pendingRequests.get(requestKey);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pendingRequests.delete(requestKey);
    } else {
      // Emit error event
      this.emit(EVENTS.ERROR, error);
    }
  }

  /**
   * Handle data message from server (subscribe/fetch response)
   */
  private handleDataMessage(message: ServerMessage): void {
    const channel = message.channel as ChannelName;
    const data = extractResponseData(message);
    const requestKey = this.getRequestKey(channel);

    // Resolve pending request if exists
    const pending = this.pendingRequests.get(requestKey);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(data);
      this.pendingRequests.delete(requestKey);
    }

    // Emit data event
    this.emit(EVENTS.DATA, channel, data);
  }

  /**
   * Handle update message from server (real-time update)
   */
  private handleUpdateMessage(message: ServerMessage): void {
    const channel = message.channel as ChannelName;
    const data = extractResponseData(message);

    // Emit update event
    this.emit(EVENTS.UPDATE, channel, data);
  }

  /**
   * Send message and wait for response
   */
  private async sendMessageAndWait<T extends ServerResponseData>(
    message: any,
    channel: ChannelName,
  ): Promise<T> {
    if (!this.ws || !this.isConnected) {
      throw new Error("Not connected to WebSocket server");
    }

    return new Promise((resolve, reject) => {
      const requestKey = this.getRequestKey(channel);

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestKey);
        reject(new Error(`Request timeout for channel: ${channel}`));
      }, MESSAGE_TIMEOUT);

      // Store pending request
      this.pendingRequests.set(requestKey, {
        resolve: resolve as (data: any) => void,
        reject,
        timeout,
      });

      // Send message
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.ws!.send(serializeClientMessage(message));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestKey);
        reject(
          error instanceof Error ? error : new Error("Failed to send message"),
        );
      }
    });
  }

  /**
   * Get request key for tracking pending requests
   */
  private getRequestKey(channel: ChannelName): string {
    return `${channel}`;
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (!this.auth) {
      this.debug("No auth data, cannot reconnect");
      this.updateState("disconnected");
      return;
    }

    // Check max attempts
    if (
      this.config.reconnectAttempts > 0 &&
      this._reconnectAttempt >= this.config.reconnectAttempts
    ) {
      this.debug("Max reconnection attempts reached");
      this.updateState("disconnected");
      this.disconnect(
        CUSTOM_CLOSE_CODES.MAX_RECONNECTS,
        "Max reconnection attempts reached",
      );
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay *
        Math.pow(RECONNECT_BACKOFF_MULTIPLIER, this._reconnectAttempt),
      this.config.maxReconnectDelay,
    );

    this._reconnectAttempt++;
    this._isReconnecting = true;
    this.updateState("reconnecting");

    this.debug(
      `Reconnecting in ${delay}ms (attempt ${this._reconnectAttempt})`,
    );

    // Emit reconnecting event
    this.emit(EVENTS.RECONNECTING, this._reconnectAttempt, delay);

    // Schedule reconnection
    this.reconnectTimer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.connect(this.auth!).catch((error) => {
        this.debug("Reconnection failed", error);
        this.handleClose(CLOSE_CODES.ABNORMAL, "Reconnection failed");
      });
    }, delay);
  }

  /**
   * Cancel reconnection
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._isReconnecting = false;
  }

  /**
   * Resubscribe to all active channels
   */
  private async resubscribeAll(): Promise<void> {
    this.debug("Resubscribing to all channels", {
      count: this.subscriptionMap.size,
    });

    const subscriptions = Array.from(this.subscriptionMap.values());

    for (const subscription of subscriptions) {
      try {
        await this.subscribe(subscription.channel, subscription.params);
      } catch (error) {
        this.debug(`Failed to resubscribe to ${subscription.channel}`, error);
        // Continue with next subscription
      }
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Clear connection timeout
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    // Reject all pending requests
    for (const [key, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
      this.pendingRequests.delete(key);
    }

    // Remove WebSocket event listeners and close
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Update connection state and emit state change event
   */
  private updateState(newState: ConnectionState): void {
    const oldState = this.connectionState;
    if (oldState !== newState) {
      this.connectionState = newState;
      this.emit(EVENTS.STATE_CHANGE, oldState, newState);
      this.debug("State changed", { from: oldState, to: newState });
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: keyof WebSocketEventMap, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      }
    }
  }

  /**
   * Debug logging
   */
  private debug(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[WildduckWebSocket] ${message}`, ...args);
    }
  }
}
