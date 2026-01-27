import type { NetworkClient, Optional } from "@sudobility/types";
import type { StorageService } from "@sudobility/di/interfaces";
import type {
  CreateMailboxRequest,
  GetMailboxesRequest,
  GetMessagesRequest,
  WildduckAddressResponse,
  WildduckAuthenticateRequest,
  WildduckAuthResponse,
  WildduckAutoreplyRequest,
  WildduckAutoreplyResponse,
  WildduckConfig,
  WildduckCreateUserRequest,
  WildduckCreateUserResponse,
  WildduckForwardMessageRequest,
  WildduckMailboxResponse,
  WildduckMessageResponse,
  WildduckMessagesResponse,
  WildduckPreAuthRequest,
  WildduckPreAuthResponse,
  WildduckSubmitMessageRequest,
  WildduckSubmitMessageResponse,
  WildduckSuccessResponse,
  WildduckUpdateMailboxRequest,
  WildduckUpdateMessageRequest,
  WildduckUpdateMessageResponse,
  WildduckUpdateUserRequest,
  WildduckUploadMessageRequest,
  WildduckUploadMessageResponse,
  WildduckUserAuth,
  WildduckUserResponse,
} from "@sudobility/mail_box_types";
import type {
  WildduckSearchMessagesResponse,
  WildduckSearchQueryParams,
} from "../types/wildduck-search";

// Storage keys utility
const getWildduckStorageKeys = (username: string) => ({
  token: `wildduck_token_${username}`,
  userId: `wildduck_userId_${username}`,
  session: `wildduck_session_${username}`,
  authCache: `wildduck_authCache_${username}`,
  legacy: `wildduck_legacy_${username}`,
});

// URL search params utility
const createURLSearchParams = () => {
  const params: Record<string, string[]> = {};
  return {
    append: (key: string, value: string) => {
      if (!params[key]) {
        params[key] = [];
      }
      params[key].push(value);
    },
    toString: () => {
      return Object.entries(params)
        .flatMap(([key, values]) =>
          values.map(
            (value) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
          ),
        )
        .join("&");
    },
  };
};

// Determine API base URL based on Cloudflare worker configuration
const getApiBaseUrl = (config: WildduckConfig): string => {
  if (config.cloudflareWorkerUrl) {
    return config.cloudflareWorkerUrl;
  }

  return config.backendUrl;
};

// Wildduck API configuration factory
const createApiConfig = (config: WildduckConfig) => ({
  BASE_URL: getApiBaseUrl(config),
  BACKEND_URL: config.backendUrl, // Direct backend URL for non-API calls
  API_TOKEN: config.apiToken, // API access token
  USE_CLOUDFLARE: !!config.cloudflareWorkerUrl,
  ENDPOINTS: {
    // Wildduck API endpoints
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

// Removed: Legacy API_CONFIG - consumers must provide their own WildduckConfig

// Wildduck API client
class WildduckClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private networkClient: NetworkClient;
  private config: ReturnType<typeof createApiConfig>;
  private storage: Optional<StorageService>;

  constructor(
    networkClient: NetworkClient,
    config: WildduckConfig,
    storage?: StorageService,
  ) {
    this.config = createApiConfig(config);
    this.baseUrl = this.config.BASE_URL;
    this.networkClient = networkClient;
    this.storage = storage || null;

    // Set basic headers - authentication is handled per-request via wildduckUserAuth
    this.headers = {
      ...this.config.DEFAULT_HEADERS,
    };
  }

  /**
   * Set the user authentication token
   * @deprecated Use wildduckUserAuth parameter in request methods instead.
   * This method is kept for backward compatibility but does nothing.
   */
  setUserToken(_token: string): void {
    // No-op: Authentication is now handled via wildduckUserAuth parameter
  }

  /**
   * Clear the user authentication token
   * @deprecated Use wildduckUserAuth parameter in request methods instead.
   * This method is kept for backward compatibility but does nothing.
   */
  clearUserToken(): void {
    // No-op: Authentication is now handled via wildduckUserAuth parameter
  }

  /**
   * Load user token from session storage for a given username
   * @deprecated Use wildduckUserAuth parameter in request methods instead.
   * This method is kept for backward compatibility but does nothing.
   */
  loadUserTokenFromStorage(_username: string): boolean {
    // No-op: Authentication is now handled via wildduckUserAuth parameter
    return false;
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: Optional<"GET" | "POST" | "PUT" | "DELETE">;
      body?: Optional<Record<string, unknown> | string | FormData | Blob>;
      headers?: Optional<Record<string, string>>;
      wildduckUserAuth?: Optional<WildduckUserAuth>;
    } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const requestOptions: any = {
      method: options.method || "GET",
      headers: {
        ...this.headers,
        ...options.headers,
      },
    };

    // If wildduckUserAuth is provided, use its accessToken
    if (options.wildduckUserAuth?.accessToken) {
      requestOptions.headers["Authorization"] =
        `Bearer ${options.wildduckUserAuth.accessToken}`;
    }

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
  }

  // Pre-authenticate user to check if username exists
  async preAuth(
    request: WildduckPreAuthRequest,
  ): Promise<WildduckPreAuthResponse> {
    const requestBody: WildduckPreAuthRequest = {
      username: request.username,
      scope: request.scope || "master",
      sess: request.sess || "api-session",
      ip: request.ip || "127.0.0.1",
    };

    const response = await this.request<WildduckPreAuthResponse>("/preauth", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    return response;
  }

  // Authenticate user with Wildduck using blockchain signature
  async authenticate(
    request: WildduckAuthenticateRequest,
    options?: { isDev?: boolean },
  ): Promise<WildduckAuthResponse> {
    const requestBody: any = {
      username: request.username,
      ...(request.signature && { signature: request.signature }), // Signature that was created by signing the message
      ...(request.message && { message: request.message }), // SIWE/SIWS message that was signed
      ...(request.signer && { signer: request.signer }), // The wallet address that created the signature
      ...(request.referralCode && { referralCode: request.referralCode }), // Referral code from another user
      // Wildduck handles ENS/SNS resolution internally
      scope: request.scope || "master", // master scope for full access
      token: request.token !== undefined ? request.token : true, // Request a token to get access token in response
      protocol: request.protocol || "API", // Application identifier for security logs
      sess: request.sess || "api-session", // Session identifier
      ip: request.ip || "127.0.0.1", // IP address for logging
      ...(request.appId && { appId: request.appId }),
    };

    // Add isDev flag if provided
    if (options?.isDev !== undefined) {
      requestBody.isDev = options.isDev;
    }

    const response = await this.request<WildduckAuthResponse>("/authenticate", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    // Store the user ID and token in storage if authentication is successful
    if (response.success && response.id && this.storage) {
      try {
        const keys = getWildduckStorageKeys(request.username);
        await this.storage.setItem(keys.userId, response.id);

        // Store the user token if provided
        if (response.token) {
          await this.storage.setItem(keys.token, response.token);
          // Set the user token for this API client instance
          this.setUserToken(response.token);
        }
      } catch {
        // Failed to store in storage
      }
    }

    return response;
  }

  // Legacy password-based authentication (fallback for testing)
  // Note: Wildduck primarily uses blockchain authentication, password auth may be limited
  async authenticateWithPassword(
    username: string,
    password: string,
    scope?: string,
  ): Promise<WildduckAuthResponse> {
    const response = await this.request<WildduckAuthResponse>("/authenticate", {
      method: "POST",
      body: {
        username,
        password, // This might not work with current Wildduck - blockchain auth is preferred
        scope: scope || "master", // master scope for full access
        token: true, // Request a token
        protocol: "API",
        sess: "api-session",
        ip: "127.0.0.1",
      },
    });

    // Store the user ID and token in storage if authentication is successful
    if (response.success && response.id && this.storage) {
      try {
        const keys = getWildduckStorageKeys(username);
        await this.storage.setItem(keys.userId, response.id);

        // Store the user token if provided
        if (response.token) {
          await this.storage.setItem(keys.token, response.token);
          // Set the user token for this API client instance
          this.setUserToken(response.token);
        }
      } catch {
        // Failed to store in storage
      }
    }

    return response;
  }

  // Get user info
  async getUser(
    wildduckUserAuth: WildduckUserAuth,
  ): Promise<WildduckUserResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<WildduckUserResponse>(`/users/${validatedUserId}`, {
      wildduckUserAuth,
    });
  }

  // Get mailboxes for a user
  async getMailboxes(
    wildduckUserAuth: WildduckUserAuth,
    options?: Omit<GetMailboxesRequest, "sess" | "ip">,
  ): Promise<WildduckMailboxResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    const queryParams = createURLSearchParams();

    if (options?.specialUse) queryParams.append("specialUse", "true");
    if (options?.showHidden) queryParams.append("showHidden", "true");
    if (options?.counters) queryParams.append("counters", "true");
    if (options?.sizes) queryParams.append("sizes", "true");

    const query = queryParams.toString();
    const endpoint = `/users/${validatedUserId}/mailboxes${query ? `?${query}` : ""}`;

    return this.request<WildduckMailboxResponse>(endpoint, {
      wildduckUserAuth,
    });
  }

  // Get messages from a mailbox
  async getMessages(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    options?: Omit<GetMessagesRequest, "sess" | "ip">,
  ): Promise<WildduckMessagesResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

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

    return this.request<WildduckMessagesResponse>(endpoint, {
      wildduckUserAuth,
    });
  }

  // Search messages across all mailboxes
  async searchMessages(
    wildduckUserAuth: WildduckUserAuth,
    params: WildduckSearchQueryParams & { q: string },
  ): Promise<WildduckSearchMessagesResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    const queryParams = createURLSearchParams();
    if (params.q) queryParams.append("q", params.q);
    if (params.mailbox) queryParams.append("mailbox", params.mailbox);
    if (params.id) queryParams.append("id", params.id);
    if (params.thread) queryParams.append("thread", params.thread);
    if (params.query) queryParams.append("query", params.query);
    if (params.datestart) queryParams.append("datestart", params.datestart);
    if (params.dateend) queryParams.append("dateend", params.dateend);
    if (params.from) queryParams.append("from", params.from);
    if (params.to) queryParams.append("to", params.to);
    if (params.subject) queryParams.append("subject", params.subject);
    if (params.minSize !== undefined)
      queryParams.append("minSize", params.minSize.toString());
    if (params.maxSize !== undefined)
      queryParams.append("maxSize", params.maxSize.toString());
    if (params.attachments !== undefined)
      queryParams.append("attachments", String(params.attachments));
    if (params.flagged !== undefined)
      queryParams.append("flagged", String(params.flagged));
    if (params.unseen !== undefined)
      queryParams.append("unseen", String(params.unseen));
    if (params.searchable !== undefined)
      queryParams.append("searchable", String(params.searchable));
    if (params.threadCounters !== undefined)
      queryParams.append("threadCounters", String(params.threadCounters));
    if (params.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params.page !== undefined)
      queryParams.append("page", params.page.toString());
    if (params.order) queryParams.append("order", params.order);
    if (params.next) queryParams.append("next", params.next);
    if (params.previous) queryParams.append("previous", params.previous);
    if (params.includeHeaders) {
      const headers = Array.isArray(params.includeHeaders)
        ? params.includeHeaders
        : [params.includeHeaders];
      headers.forEach((header) => queryParams.append("includeHeaders", header));
    }
    if (params.or && Object.keys(params.or).length > 0) {
      queryParams.append("or", JSON.stringify(params.or));
    }

    const queryString = queryParams.toString();
    const endpoint = `/users/${validatedUserId}/search${queryString ? `?${queryString}` : ""}`;

    return this.request<WildduckSearchMessagesResponse>(endpoint, {
      wildduckUserAuth,
    });
  }

  // Get a specific message by ID
  async getMessage(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: string,
  ): Promise<WildduckMessageResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    // Validate mailbox ID format
    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    // Note: messageId can be numeric (sequence number) or ObjectId depending on WildDuck configuration
    // No validation needed - the API will handle invalid IDs

    const endpoint = `/users/${validatedUserId}/mailboxes/${mailboxId}/messages/${messageId}`;

    return this.request<WildduckMessageResponse>(endpoint, {
      wildduckUserAuth,
    });
  }

  // Get user addresses (email addresses)
  async getAddresses(
    wildduckUserAuth: WildduckUserAuth,
  ): Promise<WildduckAddressResponse> {
    // Validate user ID format
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    const endpoint = `/users/${validatedUserId}/addresses`;

    return this.request<WildduckAddressResponse>(endpoint, {
      wildduckUserAuth,
    });
  }

  // Create a new mailbox
  async createMailbox(
    wildduckUserAuth: WildduckUserAuth,
    request: CreateMailboxRequest,
  ): Promise<WildduckMailboxResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

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

    return this.request<WildduckMailboxResponse>(
      `/users/${validatedUserId}/mailboxes`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        wildduckUserAuth,
      },
    );
  }

  // ============================================================================
  // User Management Methods
  // ============================================================================

  // Create a new user
  async createUser(
    request: WildduckCreateUserRequest,
  ): Promise<WildduckCreateUserResponse> {
    return this.request<WildduckCreateUserResponse>("/users", {
      method: "POST",
      body: request,
    });
  }

  // Update user information
  async updateUser(
    wildduckUserAuth: WildduckUserAuth,
    request: WildduckUpdateUserRequest,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<WildduckSuccessResponse>(`/users/${validatedUserId}`, {
      method: "PUT",
      body: request,
      wildduckUserAuth,
    });
  }

  // Delete a user
  async deleteUser(
    wildduckUserAuth: WildduckUserAuth,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<WildduckSuccessResponse>(`/users/${validatedUserId}`, {
      method: "DELETE",
      wildduckUserAuth,
    });
  }

  // ============================================================================
  // Mailbox Management Methods (Extended)
  // ============================================================================

  // Get specific mailbox information
  async getMailbox(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
  ): Promise<WildduckMailboxResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<WildduckMailboxResponse>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}`,
      {
        wildduckUserAuth,
      },
    );
  }

  // Update mailbox settings
  async updateMailbox(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    request: WildduckUpdateMailboxRequest,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<WildduckSuccessResponse>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}`,
      {
        method: "PUT",
        body: request,
        wildduckUserAuth,
      },
    );
  }

  // Delete a mailbox
  async deleteMailbox(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<WildduckSuccessResponse>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}`,
      {
        method: "DELETE",
        wildduckUserAuth,
      },
    );
  }

  // ============================================================================
  // Message Management Methods (Extended)
  // ============================================================================

  // Get full message details from a specific mailbox
  async getMessageFromMailbox(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
    options?: {
      replaceCidLinks?: boolean;
      markAsSeen?: boolean;
    },
  ): Promise<WildduckMessageResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    const queryParams = createURLSearchParams();
    if (options?.replaceCidLinks !== undefined)
      queryParams.append("replaceCidLinks", String(options.replaceCidLinks));
    if (options?.markAsSeen !== undefined)
      queryParams.append("markAsSeen", String(options.markAsSeen));

    const query = queryParams.toString();
    const endpoint = `/users/${validatedUserId}/mailboxes/${mailboxId}/messages/${messageId}${query ? `?${query}` : ""}`;

    return this.request<WildduckMessageResponse>(endpoint, {
      wildduckUserAuth,
    });
  }

  // Upload/create a message in a mailbox (for drafts, imports, etc.)
  async uploadMessage(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    request: WildduckUploadMessageRequest,
  ): Promise<WildduckUploadMessageResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<WildduckUploadMessageResponse>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}/messages`,
      {
        method: "POST",
        body: request,
        wildduckUserAuth,
      },
    );
  }

  // Update message flags or move to different mailbox
  async updateMessage(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
    request: WildduckUpdateMessageRequest,
  ): Promise<WildduckUpdateMessageResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<WildduckUpdateMessageResponse>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}/messages/${messageId}`,
      {
        method: "PUT",
        body: request,
        wildduckUserAuth,
      },
    );
  }

  // Delete a message from mailbox
  async deleteMessage(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<WildduckSuccessResponse>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}/messages/${messageId}`,
      {
        method: "DELETE",
        wildduckUserAuth,
      },
    );
  }

  // Get raw message source (RFC822 format)
  async getMessageSource(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
  ): Promise<string> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<string>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}/messages/${messageId}/message.eml`,
      {
        method: "GET",
        wildduckUserAuth,
      },
    );
  }

  // Download message attachment
  async getMessageAttachment(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
    attachmentId: string,
  ): Promise<Blob> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<Blob>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}/messages/${messageId}/attachments/${attachmentId}`,
      {
        method: "GET",
        wildduckUserAuth,
      },
    );
  }

  // Forward a stored message
  async forwardMessage(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
    request: WildduckForwardMessageRequest,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<WildduckSuccessResponse>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}/messages/${messageId}/forward`,
      {
        method: "POST",
        body: request,
        wildduckUserAuth,
      },
    );
  }

  // Submit a draft message for delivery
  async submitDraft(
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    if (!isValidObjectId(mailboxId)) {
      throw new Error(
        `Invalid mailbox ID format: "${mailboxId}". Expected 24-character hexadecimal string (MongoDB ObjectId)`,
      );
    }

    return this.request<WildduckSuccessResponse>(
      `/users/${validatedUserId}/mailboxes/${mailboxId}/messages/${messageId}/submit`,
      {
        method: "POST",
        wildduckUserAuth,
      },
    );
  }

  // Submit a new message for delivery
  async submitMessage(
    wildduckUserAuth: WildduckUserAuth,
    request: WildduckSubmitMessageRequest,
  ): Promise<WildduckSubmitMessageResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<WildduckSubmitMessageResponse>(
      `/users/${validatedUserId}/submit`,
      {
        method: "POST",
        body: request,
        wildduckUserAuth,
      },
    );
  }

  // ============================================================================
  // Autoreply Methods
  // ============================================================================

  // Get autoreply/vacation responder settings
  async getAutoreply(
    wildduckUserAuth: WildduckUserAuth,
  ): Promise<WildduckAutoreplyResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<WildduckAutoreplyResponse>(
      `/users/${validatedUserId}/autoreply`,
      {
        wildduckUserAuth,
      },
    );
  }

  // Update autoreply/vacation responder settings
  async updateAutoreply(
    wildduckUserAuth: WildduckUserAuth,
    request: WildduckAutoreplyRequest,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<WildduckSuccessResponse>(
      `/users/${validatedUserId}/autoreply`,
      {
        method: "PUT",
        body: request,
        wildduckUserAuth,
      },
    );
  }

  // Disable autoreply/vacation responder
  async deleteAutoreply(
    wildduckUserAuth: WildduckUserAuth,
  ): Promise<WildduckSuccessResponse> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<WildduckSuccessResponse>(
      `/users/${validatedUserId}/autoreply`,
      {
        method: "DELETE",
        wildduckUserAuth,
      },
    );
  }

  // ============================================================================
  // Filter Management Methods
  // ============================================================================

  // Get user filters
  async getFilters(wildduckUserAuth: WildduckUserAuth): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/filters`, {
      method: "GET",
      wildduckUserAuth,
    });
  }

  // Create filter
  async createFilter(
    wildduckUserAuth: WildduckUserAuth,
    filter: any,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/filters`, {
      method: "POST",
      body: filter,
      wildduckUserAuth,
    });
  }

  // Update filter
  async updateFilter(
    wildduckUserAuth: WildduckUserAuth,
    filterId: string,
    filter: any,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/filters/${filterId}`, {
      method: "PUT",
      body: filter,
      wildduckUserAuth,
    });
  }

  // Delete filter
  async deleteFilter(
    wildduckUserAuth: WildduckUserAuth,
    filterId: string,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/filters/${filterId}`, {
      method: "DELETE",
      wildduckUserAuth,
    });
  }

  // ============================================================================
  // Spam Settings Methods
  // ============================================================================

  // Get spam settings
  async getSpamSettings(wildduckUserAuth: WildduckUserAuth): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}`, {
      method: "GET",
      wildduckUserAuth,
    });
  }

  // Update spam level
  async updateSpamLevel(
    wildduckUserAuth: WildduckUserAuth,
    spamLevel: number,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}`, {
      method: "PUT",
      body: { spamLevel },
      wildduckUserAuth,
    });
  }

  // Add to whitelist
  async addToWhitelist(
    wildduckUserAuth: WildduckUserAuth,
    address: string,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/fromwhitelist`, {
      method: "POST",
      body: { address },
      wildduckUserAuth,
    });
  }

  // Remove from whitelist
  async removeFromWhitelist(
    wildduckUserAuth: WildduckUserAuth,
    address: string,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(
      `/users/${validatedUserId}/fromwhitelist/${encodeURIComponent(address)}`,
      {
        method: "DELETE",
        wildduckUserAuth,
      },
    );
  }

  // ============================================================================
  // Forwarding Methods
  // ============================================================================

  // Get forwarding targets
  async getForwardingTargets(wildduckUserAuth: WildduckUserAuth): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}`, {
      method: "GET",
      wildduckUserAuth,
    });
  }

  // Add forwarding target
  async addForwardingTarget(
    wildduckUserAuth: WildduckUserAuth,
    target: string,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/targets`, {
      method: "POST",
      body: { target },
      wildduckUserAuth,
    });
  }

  // Remove forwarding target
  async removeForwardingTarget(
    wildduckUserAuth: WildduckUserAuth,
    target: string,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(
      `/users/${validatedUserId}/targets/${encodeURIComponent(target)}`,
      {
        method: "DELETE",
        wildduckUserAuth,
      },
    );
  }

  // ============================================================================
  // User Settings Methods
  // ============================================================================

  // Get user settings
  async getUserSettings(wildduckUserAuth: WildduckUserAuth): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}`, {
      method: "GET",
      wildduckUserAuth,
    });
  }

  // Update user settings (generic)
  async updateUserSettings(
    wildduckUserAuth: WildduckUserAuth,
    settings: any,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}`, {
      method: "PUT",
      body: settings,
      wildduckUserAuth,
    });
  }

  // ============================================================================
  // Authentication Status Methods
  // ============================================================================

  /**
   * Check authentication status of a token
   * @param token - Token to check (uses as Bearer token)
   * @returns Authentication status with user info if valid
   */
  async checkAuthStatus(token: string): Promise<{
    success: boolean;
    id?: string;
    username?: string;
    address?: string;
  }> {
    // Create a temporary WildduckUserAuth-like object just for the token
    const tempAuth: WildduckUserAuth = {
      userId: "",
      username: "",
      accessToken: token,
    };

    return this.request<{
      success: boolean;
      id?: string;
      username?: string;
      address?: string;
    }>("/users/me", {
      method: "GET",
      wildduckUserAuth: tempAuth,
    });
  }

  /**
   * Logout/delete authentication token
   * @param token - Token to logout
   * @returns Success response
   */
  async logout(token: string): Promise<{ success: boolean }> {
    const tempAuth: WildduckUserAuth = {
      userId: "",
      username: "",
      accessToken: token,
    };

    return this.request<{ success: boolean }>("/authenticate", {
      method: "DELETE",
      wildduckUserAuth: tempAuth,
    });
  }

  // ============================================================================
  // System-Level Operations (using system token)
  // ============================================================================

  /**
   * Get server health status
   * @returns Health status
   */
  async getHealth(): Promise<any> {
    return this.request("/health", {
      method: "GET",
    });
  }

  /**
   * Get users list with optional filters
   * @param filters - Optional filters
   * @returns Users list
   */
  async getUsersList(filters?: Record<string, unknown>): Promise<any> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ""}`;

    return this.request(endpoint, {
      method: "GET",
    });
  }

  /**
   * Get user settings
   * @param wildduckUserAuth - User authentication
   * @returns User settings
   */
  async getSettings(wildduckUserAuth: WildduckUserAuth): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/settings`, {
      method: "GET",
      wildduckUserAuth,
    });
  }

  /**
   * Update a user setting
   * @param wildduckUserAuth - User authentication
   * @param key - Setting key
   * @param value - Setting value
   * @returns Success response
   */
  async updateSetting(
    wildduckUserAuth: WildduckUserAuth,
    key: string,
    value: any,
  ): Promise<{ success: boolean }> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<{ success: boolean }>(
      `/users/${validatedUserId}/settings/${key}`,
      {
        method: "PUT",
        body: { value },
        wildduckUserAuth,
      },
    );
  }

  /**
   * Delete a user setting
   * @param wildduckUserAuth - User authentication
   * @param key - Setting key
   * @returns Success response
   */
  async deleteSetting(
    wildduckUserAuth: WildduckUserAuth,
    key: string,
  ): Promise<{ success: boolean }> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<{ success: boolean }>(
      `/users/${validatedUserId}/settings/${key}`,
      {
        method: "DELETE",
        wildduckUserAuth,
      },
    );
  }

  /**
   * Get a specific filter by ID
   * @param wildduckUserAuth - User authentication
   * @param filterId - Filter ID
   * @returns Filter details
   */
  async getFilter(
    wildduckUserAuth: WildduckUserAuth,
    filterId: string,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/filters/${filterId}`, {
      method: "GET",
      wildduckUserAuth,
    });
  }

  /**
   * Get forwarded addresses (system-level)
   * @returns Forwarded addresses
   */
  async getForwardedAddresses(): Promise<any> {
    return this.request("/addresses/forwarded", {
      method: "GET",
    });
  }

  /**
   * Create forwarded address (system-level)
   * @param params - Forwarded address parameters
   * @returns Created forwarded address
   */
  async createForwardedAddressSystem(params: {
    address: string;
    target: string;
  }): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(
      "/addresses/forwarded",
      {
        method: "POST",
        body: params,
      },
    );
  }

  /**
   * Delete forwarded address (system-level)
   * @param addressId - Address ID
   * @returns Success response
   */
  async deleteForwardedAddressSystem(
    addressId: string,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/addresses/forwarded/${addressId}`,
      {
        method: "DELETE",
      },
    );
  }

  /**
   * Resolve an address
   * @param address - Address to resolve
   * @returns Resolved address information
   */
  async resolveAddress(address: string): Promise<any> {
    return this.request(`/addresses/resolve/${encodeURIComponent(address)}`, {
      method: "GET",
    });
  }

  /**
   * Create address for user
   * @param wildduckUserAuth - User authentication
   * @param params - Address creation parameters
   * @returns Created address
   */
  async createAddress(
    wildduckUserAuth: WildduckUserAuth,
    params: any,
  ): Promise<any> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request(`/users/${validatedUserId}/addresses`, {
      method: "POST",
      body: params,
      wildduckUserAuth,
    });
  }

  /**
   * Update address
   * @param wildduckUserAuth - User authentication
   * @param addressId - Address ID
   * @param params - Update parameters
   * @returns Success response
   */
  async updateAddress(
    wildduckUserAuth: WildduckUserAuth,
    addressId: string,
    params: any,
  ): Promise<{ success: boolean }> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<{ success: boolean }>(
      `/users/${validatedUserId}/addresses/${addressId}`,
      {
        method: "PUT",
        body: params,
        wildduckUserAuth,
      },
    );
  }

  /**
   * Delete address
   * @param wildduckUserAuth - User authentication
   * @param addressId - Address ID
   * @returns Success response
   */
  async deleteAddress(
    wildduckUserAuth: WildduckUserAuth,
    addressId: string,
  ): Promise<{ success: boolean }> {
    const validatedUserId = validateUserId(wildduckUserAuth.userId);

    return this.request<{ success: boolean }>(
      `/users/${validatedUserId}/addresses/${addressId}`,
      {
        method: "DELETE",
        wildduckUserAuth,
      },
    );
  }
}

// Factory function to create Wildduck API client with dependencies
const createWildduckClient = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  storage?: StorageService,
): WildduckClient => {
  return new WildduckClient(networkClient, config, storage);
};

// Export the main WildduckClient class
export { WildduckClient };
// Legacy export for backward compatibility
export { WildduckClient as WildduckAPI };

// Helper function to validate MongoDB ObjectId format
const isValidObjectId = (id: string): boolean => {
  return /^[a-f0-9]{24}$/i.test(id);
};

// Helper function to get Wildduck user ID for an email address
// This retrieves the actual MongoDB ObjectId from storage after authentication
const emailToUserId = async (
  emailAddress: string,
  storage: StorageService,
): Promise<string> => {
  // Extract the wallet address part from email if it's in email format
  let username = emailAddress.toLowerCase();
  if (username.includes("@")) {
    const parts = username.split("@");
    username = parts[0] || username; // Extract just the address part
  }

  try {
    const keys = getWildduckStorageKeys(username);

    // Check storage keys in priority order
    const storageKeys = [
      { key: keys.userId, type: "userId" },
      { key: keys.authCache, type: "cache" },
      { key: keys.legacy, type: "legacy" },
    ];

    for (const { key, type } of storageKeys) {
      const stored = await storage.getItem(key);
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
          // Found stored value but not a valid ObjectId
        }
      }
    }
  } catch {
    // Failed to retrieve user ID from storage
  }

  // Fallback: No stored user ID found
  // Instead of returning a fake user ID, throw an error to surface the real issue
  throw new Error(
    `No Wildduck user ID found for ${username}. Authentication may have failed or user doesn't exist in database.`,
  );
};

// Helper function to ensure a string is a valid user ID for Wildduck API calls
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

export {
  createWildduckClient,
  createWildduckClient as createWildduckAPI,
  emailToUserId,
  validateUserId,
  isValidObjectId,
};
