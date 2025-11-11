import type {
  AutoReplySettings,
  NetworkClient,
  WildduckConfig,
} from "@sudobility/types";

/**
 * Parameters for updating auto-reply
 */
export interface UpdateAutoReplyParams {
  status?: boolean;
  name?: string;
  subject?: string;
  text?: string;
  html?: string;
  start?: string;
  end?: string;
  sess?: string;
  ip?: string;
}

/**
 * Get current auto-reply settings
 * GET /users/:user/autoreply
 */
export async function getAutoReply(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
): Promise<AutoReplySettings> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<AutoReplySettings>(
    `${apiUrl}/users/${userId}/autoreply`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(config.cloudflareWorkerUrl
          ? {
              Authorization: `Bearer ${config.apiToken}`,
              "X-App-Source": "0xmail-box",
            }
          : { "X-Access-Token": config.apiToken }),
      },
    },
  );
  return response?.data as AutoReplySettings;
}

/**
 * Update auto-reply settings
 * PUT /users/:user/autoreply
 * @param status - Enable or disable auto-reply
 * @param name - Name to use in the auto-reply message
 * @param subject - Subject line for auto-reply
 * @param text - Plain text auto-reply message
 * @param html - HTML auto-reply message
 * @param start - ISO 8601 datetime to start auto-reply
 * @param end - ISO 8601 datetime to end auto-reply
 */
export async function updateAutoReply(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  params: UpdateAutoReplyParams,
): Promise<{ success: boolean }> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<{ success: boolean }>(
    `${apiUrl}/users/${userId}/autoreply`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(config.cloudflareWorkerUrl
          ? {
              Authorization: `Bearer ${config.apiToken}`,
              "X-App-Source": "0xmail-box",
            }
          : { "X-Access-Token": config.apiToken }),
      },
      body: JSON.stringify(params),
    },
  );
  return response?.data as { success: boolean };
}

/**
 * Enable auto-reply with default message
 * PUT /users/:user/autoreply
 */
export async function enableAutoReply(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  message: {
    subject: string;
    text: string;
    html?: string;
    name?: string;
  },
  schedule?: {
    start?: string;
    end?: string;
  },
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const params: any = {
    status: true,
    ...message,
    ...schedule,
  };
  if (sess) params.sess = sess;
  if (ip) params.ip = ip;
  return updateAutoReply(networkClient, config, userId, params);
}

/**
 * Disable auto-reply
 * PUT /users/:user/autoreply
 */
export async function disableAutoReply(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const params: any = { status: false };
  if (sess) params.sess = sess;
  if (ip) params.ip = ip;
  return updateAutoReply(networkClient, config, userId, params);
}

/**
 * Delete auto-reply settings
 * DELETE /users/:user/autoreply
 */
export async function deleteAutoReply(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<{ success: boolean }>(
    `${apiUrl}/users/${userId}/autoreply`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(config.cloudflareWorkerUrl
          ? {
              Authorization: `Bearer ${config.apiToken}`,
              "X-App-Source": "0xmail-box",
            }
          : { "X-Access-Token": config.apiToken }),
      },
      body: JSON.stringify({ sess, ip }),
    },
  );
  return response?.data as { success: boolean };
}
