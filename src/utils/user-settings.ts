import type {
  NetworkClient,
  UserInfo,
  WildduckConfig,
} from "@sudobility/types";

/**
 * Get user information
 * GET /users/:user
 */
export async function getUserInfo(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
): Promise<UserInfo> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<UserInfo>(
    `${apiUrl}/users/${userId}`,
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
  return response?.data as UserInfo;
}

/**
 * Update user display name
 * PUT /users/:user
 */
export async function updateUserName(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  name: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<{ success: boolean }>(
    `${apiUrl}/users/${userId}`,
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
      body: JSON.stringify({
        name,
        sess,
        ip,
      }),
    },
  );
  return response?.data as { success: boolean };
}

/**
 * Update user settings (general purpose)
 * PUT /users/:user
 */
export async function updateUserSettings(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  settings: {
    name?: string;
    language?: string;
    retention?: number;
    quota?: number;
    recipients?: number;
    forwards?: number;
    filters?: number;
    imapMaxUpload?: number;
    imapMaxDownload?: number;
    pop3MaxDownload?: number;
    pop3MaxMessages?: number;
    imapMaxConnections?: number;
    receivedMax?: number;
    disable2fa?: boolean;
    tags?: string[];
    disabledScopes?: string[];
    disabled?: boolean;
    suspended?: boolean;
    sess?: string;
    ip?: string;
  },
): Promise<{ success: boolean }> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<{ success: boolean }>(
    `${apiUrl}/users/${userId}`,
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
      body: JSON.stringify(settings),
    },
  );
  return response?.data as { success: boolean };
}
