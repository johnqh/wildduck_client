import type {
  AuthenticateRequest,
  CreateMailboxRequest,
  GetMailboxesRequest,
  GetMessagesRequest,
  Optional,
  PreAuthRequest,
  WildDuckAddressResponse,
  WildDuckAuthResponse,
  WildDuckConfig,
  WildDuckMailboxResponse,
  WildDuckMessageResponse,
  WildDuckMessagesResponse,
  WildDuckPreAuthResponse,
  WildDuckUserResponse,
} from "@johnqh/types";
import type { NetworkClient } from "@johnqh/di";

// Platform-specific globals
declare const sessionStorage: Storage;

// Storage keys utility
const getWildDuckStorageKeys = (username: string) => ({
  token: `wildduck_token_${username}`,
  userId: `wildduck_userId_${username}`,
  session: `wildduck_session_${username}`,
  authCache: `wildduck_authCache_${username}`,
  legacy: `wildduck_legacy_${username}`,
});

// URL search params utility
const createURLSearchParams = () => {
  const params: Record<string, string> = {};
  return {
    append: (key: string, value: string) => {
      params[key] = value;
    },
    toString: () => {
      return Object.entries(params)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join("&");
    },
  };
};

// Determine API base URL based on Cloudflare worker configuration
const getApiBaseUrl = (config: WildDuckConfig): string => {
  if (config.cloudflareWorkerUrl) {
    return config.cloudflareWorkerUrl;
  }

  return config.backendUrl;
};

// WildDuck API configuration factory
const createApiConfig = (config: WildDuckConfig) => ({
  BASE_URL: getApiBaseUrl(config),
  BACKEND_URL: config.backendUrl, // Direct backend URL for non-API calls
  API_TOKEN: config.apiToken, // API access token
  USE_CLOUDFLARE: !!config.cloudflareWorkerUrl,
  ENDPOINTS: {
    // WildDuck API endpoints
    // Authentication
    AUTHENTICATE: "/authenticate",

    // Users
    USERS: "/users",
    USER: (userId: string) => `/users/${userId}`,

    // Mailboxes
    MAILBOXES: (userId: string) => `/users/${userId}/mailboxes`,
    MAILBOX: (userId: string, mailboxId: string) =>
      `/users/${userId}/mailboxes/${mailboxId}`,

    // Messages
    MESSAGES: (userId: string, mailboxId: string) =>
      `/users/${userId}/mailboxes/${mailboxId}/messages`,
    MESSAGE: (userId: string, mailboxId: string, messageId: string) =>
      `/users/${userId}/mailboxes/${mailboxId}/messages/${messageId}`,
    MESSAGE_BY_ID: (userId: string, messageId: string) =>
      `/users/${userId}/messages/${messageId}`,

    // Addresses
    ADDRESSES: (userId: string) => `/users/${userId}/addresses`,
    ADDRESS: (userId: string, addressId: string) =>
      `/users/${userId}/addresses/${addressId}`,
  },
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Removed: Legacy API_CONFIG - consumers must provide their own WildDuckConfig

// WildDuck API client
class WildDuckAPI {
  private baseUrl: string;
  private headers: Record<string, string>;
  private apiToken: string;
  private userToken: Optional<string>; // User-specific token from /authenticate
  private networkClient: NetworkClient;
  private useCloudflare: boolean;
  private config: ReturnType<typeof createApiConfig>;

  constructor(networkClient: NetworkClient, config: WildDuckConfig) {
    this.config = createApiConfig(config);
    this.baseUrl = this.config.BASE_URL;
    this.apiToken = this.config.API_TOKEN;
    this.userToken = null;
    this.useCloudflare = this.config.USE_CLOUDFLARE;
    this.networkClient = networkClient;

    // Set headers based on whether we're using Cloudflare worker or direct connection
    this.headers = {
      ...this.config.DEFAULT_HEADERS,
    };

    this.updateHeaders();
  }

  /**
   * Update headers with the appropriate token
   * Uses userToken if available (for authenticated user operations),
   * otherwise falls back to apiToken (for public/admin operations)
   */
  private updateHeaders(): void {
    const activeToken = this.userToken || this.apiToken;

    if (this.useCloudflare) {
      // When using Cloudflare worker, send token in a different header
      // The worker will extract it and forward as X-Access-Token to WildDuck
      this.headers["Authorization"] = `Bearer ${activeToken}`;
      // Add a custom header to identify requests from the app
      this.headers["X-App-Source"] = "0xmail-box";
    } else {
      // Direct connection to WildDuck API
      // For user tokens, use Authorization: Bearer (recommended)
      // For API tokens, use X-Access-Token (backward compatibility)
      if (this.userToken) {
        this.headers["Authorization"] = `Bearer ${activeToken}`;
        delete this.headers["X-Access-Token"];
      } else {
        this.headers["X-Access-Token"] = activeToken;
      }
    }
  }

  /**
   * Set the user authentication token
   * Should be called after successful authentication with token=true
   * This token will be used for all subsequent API calls
   */
  setUserToken(token: string): void {
    this.userToken = token;
    this.updateHeaders();
    console.log("✅ User token set for WildDuck API");
  }

  /**
   * Clear the user authentication token
   * Reverts to using the master API token
   */
  clearUserToken(): void {
    this.userToken = null;
    this.updateHeaders();
    console.log("🗑️ User token cleared, reverting to API token");
  }

  /**
   * Load user token from session storage for a given username
   * Useful for restoring authentication state across page reloads
   */
  loadUserTokenFromStorage(username: string): boolean {
    try {
      const keys = getWildDuckStorageKeys(username);
      const storedToken = sessionStorage.getItem(keys.token);

      if (storedToken) {
        this.setUserToken(storedToken);
        console.log("✅ Loaded user token from session storage for:", username);
        return true;
      }

      console.warn("⚠️ No stored token found for:", username);
      return false;
    } catch (e) {
      console.error("❌ Failed to load token from session storage:", e);
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: Optional<"GET" | "POST" | "PUT" | "DELETE">;
      body?: Optional<Record<string, unknown> | string | FormData | Blob>;
      headers?: Optional<Record<string, string>>;
    } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Warn if no API authentication headers found
    if (!this.headers["X-Access-Token"] && !this.headers["Authorization"]) {
      console.warn("⚠️ No API authentication headers found!");
    }

    try {
      const requestOptions: any = {
        method: options.method || "GET",
        headers: {
          ...this.headers,
          ...options.headers,
        },
      };

      // Only add body if it exists and method supports it
      if (
        options.body &&
        (options.method === "POST" ||
          options.method === "PUT" ||
          options.method === "DELETE")
      ) {
        if (
          typeof options.body === "object" &&
          !(options.body instanceof FormData) &&
          !(options.body instanceof Blob)
        ) {
          requestOptions.body = JSON.stringify(options.body);
        } else {
          requestOptions.body = options.body;
        }
      }

      const response = await this.networkClient.request<T>(url, requestOptions);

      if (response.data === undefined) {
        throw new Error("No data received from server");
      }

      return response.data as T;
    } catch (error) {
      console.error("❌ API Request failed:", error);
      throw error;
    }
  }

  // Pre-authenticate user to check if username exists
  async preAuth(request: PreAuthRequest): Promise<WildDuckPreAuthResponse> {
    const requestBody: PreAuthRequest = {
      username: request.username,
      scope: request.scope || "master",
      sess: request.sess || "api-session",
      ip: request.ip || "127.0.0.1",
    };

    const response = await this.request<WildDuckPreAuthResponse>("/preauth", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    return response;
  }

  // Authenticate user with WildDuck using blockchain signature
  async authenticate(
    request: AuthenticateRequest,
  ): Promise<WildDuckAuthResponse> {
    const requestBody: AuthenticateRequest = {
      username: request.username,
      signature: request.signature, // Signature that was created by signing the nonce
      nonce: request.nonce, // The nonce that was signed
      message: request.message, // SIWE/SIWS message that was signed
      signer: request.signer, // The wallet address that created the signature
      // WildDuck handles ENS/SNS resolution internally
      scope: request.scope || "master", // master scope for full access
      token: request.token !== undefined ? request.token : true, // Request a token to get access token in response
      protocol: request.protocol || "API", // Application identifier for security logs
      sess: request.sess || "api-session", // Session identifier
      ip: request.ip || "127.0.0.1", // IP address for logging
      ...(request.appId && { appId: request.appId }),
    };

    const response = await this.request<WildDuckAuthResponse>("/authenticate", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    // Store the user ID and token in session storage if authentication is successful
    if (response.success && response.id) {
      try {
        const keys = getWildDuckStorageKeys(request.username);
        sessionStorage.setItem(keys.userId, response.id);

        // Store the user token if provided
        if (response.token) {
          sessionStorage.setItem(keys.token, response.token);
          // Set the user token for this API client instance
          this.setUserToken(response.token);
          console.log("✅ User token stored and activated for API calls");
        }
      } catch (e) {
        console.warn("Failed to store user ID/token in session storage:", e);
      }
    } else {
      console.error(
        "❌ WildDuck authentication failed or returned no user ID:",
        response,
      );
      if (response.success && !response.id) {
        console.error(
          "📝 Authentication succeeded but no user ID returned - this suggests user doesn't exist in WildDuck database",
        );
      }
    }

    return response;
  }

  // Legacy password-based authentication (fallback for testing)
  // Note: WildDuck primarily uses blockchain authentication, password auth may be limited
  async authenticateWithPassword(
    username: string,
    password: string,
    scope?: string,
  ): Promise<WildDuckAuthResponse> {
    const response = await this.request<WildDuckAuthResponse>("/authenticate", {
      method: "POST",
      body: {
        username,
        password, // This might not work with current WildDuck - blockchain auth is preferred
        scope: scope || "master", // master scope for full access
        token: true, // Request a token
        protocol: "API",
        sess: "api-session",
        ip: "127.0.0.1",
      },
    });

    // Store the user ID and token in session storage if authentication is successful
    if (response.success && response.id) {
      try {
        const keys = getWildDuckStorageKeys(username);
        sessionStorage.setItem(keys.userId, response.id);

        // Store the user token if provided
        if (response.token) {
          sessionStorage.setItem(keys.token, response.token);
          // Set the user token for this API client instance
          this.setUserToken(response.token);
          console.log("✅ User token stored and activated for API calls");
        }
      } catch (e) {
        console.warn("Failed to store user ID/token in session storage:", e);
      }
    }

    return response;
  }

  // Get user info
  async getUser(userId: string): Promise<WildDuckUserResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(userId);

    return this.request<WildDuckUserResponse>(`/users/${validatedUserId}`);
  }

  // Get mailboxes for a user
  async getMailboxes(
    userId: string,
    options?: Omit<GetMailboxesRequest, "sess" | "ip">,
  ): Promise<WildDuckMailboxResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(userId);

    const queryParams = createURLSearchParams();

    if (options?.specialUse) queryParams.append("specialUse", "true");
    if (options?.showHidden) queryParams.append("showHidden", "true");
    if (options?.counters) queryParams.append("counters", "true");
    if (options?.sizes) queryParams.append("sizes", "true");
    if (options?.limit) queryParams.append("limit", options.limit.toString());
    if (options?.page) queryParams.append("page", options.page.toString());
    if (options?.next) queryParams.append("next", options.next);
    if (options?.previous) queryParams.append("previous", options.previous);

    const query = queryParams.toString();
    const endpoint = `/users/${validatedUserId}/mailboxes${query ? `?${query}` : ""}`;

    return this.request<WildDuckMailboxResponse>(endpoint);
  }

  // Get messages from a mailbox
  async getMessages(
    userId: string,
    mailboxId: string,
    options?: Omit<GetMessagesRequest, "sess" | "ip">,
  ): Promise<WildDuckMessagesResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(userId);

    // Validate mailbox ID format (should also be ObjectId)
    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    const queryParams = createURLSearchParams();

    if (options?.limit) queryParams.append("limit", options.limit.toString());
    if (options?.page) queryParams.append("page", options.page.toString());
    if (options?.order) queryParams.append("order", options.order);
    if (options?.next) queryParams.append("next", options.next);
    if (options?.previous) queryParams.append("previous", options.previous);
    if (options?.unseen !== undefined)
      queryParams.append("unseen", String(options.unseen));
    if (options?.flagged !== undefined)
      queryParams.append("flagged", String(options.flagged));
    if (options?.thread) queryParams.append("thread", options.thread);
    if (options?.uid !== undefined)
      queryParams.append("uid", String(options.uid));
    if (options?.includeHeaders) {
      options.includeHeaders.forEach((header: string) =>
        queryParams.append("includeHeaders", header),
      );
    }

    const query = queryParams.toString();
    const endpoint = `/users/${validatedUserId}/mailboxes/${mailboxId}/messages${query ? `?${query}` : ""}`;

    return this.request<WildDuckMessagesResponse>(endpoint);
  }

  // Get a specific message by ID
  async getMessage(
    userId: string,
    messageId: string,
  ): Promise<WildDuckMessageResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(userId);

    // Validate message ID format (should also be ObjectId)
    if (!isValidObjectId(messageId)) {
      throw new Error(
        `Invalid message ID format: "${messageId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    const endpoint = `/users/${validatedUserId}/messages/${messageId}`;

    return this.request<WildDuckMessageResponse>(endpoint);
  }

  // Get user addresses (email addresses)
  async getAddresses(userId: string): Promise<WildDuckAddressResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(userId);

    const endpoint = `/users/${validatedUserId}/addresses`;

    return this.request<WildDuckAddressResponse>(endpoint);
  }

  // Create a new mailbox
  async createMailbox(
    userId: string,
    request: CreateMailboxRequest,
  ): Promise<WildDuckMailboxResponse> {
    const validatedUserId = validateUserId(userId);

    const requestBody: Record<string, any> = {
      path: request.path,
    };

    if (request.hidden !== undefined) requestBody.hidden = request.hidden;
    if (request.retention !== undefined)
      requestBody.retention = request.retention;
    if (request.encryptMessages !== undefined)
      requestBody.encryptMessages = request.encryptMessages;
    if (request.sess !== undefined) requestBody.sess = request.sess;
    if (request.ip !== undefined) requestBody.ip = request.ip;

    return this.request<WildDuckMailboxResponse>(
      `/users/${validatedUserId}/mailboxes`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      },
    );
  }
}

// Factory function to create WildDuck API client with dependencies
const createWildDuckAPI = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
): WildDuckAPI => {
  return new WildDuckAPI(networkClient, config);
};

// Export the main WildDuckAPI class
export { WildDuckAPI };

// Helper function to validate MongoDB ObjectId format
const isValidObjectId = (id: string): boolean => {
  return /^[a-f0-9]{24}$/i.test(id);
};

// Helper function to get WildDuck user ID for an email address
// This retrieves the actual MongoDB ObjectId from session storage after authentication
const emailToUserId = (emailAddress: string): string => {
  // Extract the wallet address part from email if it's in email format
  let username = emailAddress.toLowerCase();
  if (username.includes("@")) {
    const parts = username.split("@");
    username = parts[0] || username; // Extract just the address part
  }

  try {
    const keys = getWildDuckStorageKeys(username);

    // Check storage keys in priority order
    const storageKeys = [
      { key: keys.userId, type: "userId" },
      { key: keys.authCache, type: "cache" },
      { key: keys.legacy, type: "legacy" },
    ];

    for (const { key, type } of storageKeys) {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        // Check if it's a cached auth object
        if (type === "cache") {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.userId && isValidObjectId(parsed.userId)) {
              return parsed.userId;
            }
          } catch {
            // Not JSON, skip
          }
        } else if (isValidObjectId(stored)) {
          // Valid MongoDB ObjectId format
          return stored;
        } else {
          console.warn(
            "⚠️ Found stored value but not a valid ObjectId:",
            stored,
          );
        }
      }
    }
  } catch (e) {
    console.warn("Failed to retrieve user ID from session storage:", e);
  }

  // Fallback: No stored user ID found
  console.error(`❌ No stored user ID found for ${username}`);
  console.error(
    "📝 This usually means authentication failed or the user doesn't exist in WildDuck",
  );
  console.error(
    "📝 Check the authentication response and ensure the user was created in WildDuck",
  );
  console.error(
    "📝 Expected: 24-character hexadecimal string (MongoDB ObjectId)",
  );

  // Instead of returning a fake user ID, throw an error to surface the real issue
  throw new Error(
    `No WildDuck user ID found for ${username}. Authentication may have failed or user doesn't exist in database.`,
  );
};

// Helper function to ensure a string is a valid user ID for WildDuck API calls
const validateUserId = (userId: string): string => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!isValidObjectId(userId)) {
    throw new Error(
      `Invalid user ID format: "${userId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
    );
  }

  return userId;
};

export { createWildDuckAPI, emailToUserId, validateUserId, isValidObjectId };
