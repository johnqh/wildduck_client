import type {
  NetworkClient,
  SpamSettings,
  WildduckConfig,
} from "@sudobility/types";

/**
 * Get current spam settings (spam level and from whitelist)
 * GET /users/:user
 */
export async function getSpamSettings(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
): Promise<SpamSettings> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<any>(
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
  const data = response?.data as any;
  return {
    success: data.success,
    spamLevel: data.spamLevel,
    fromWhitelist: data.fromWhitelist || [],
  };
}

/**
 * Update spam level
 * PUT /users/:user
 * @param spamLevel - Spam filtering level (0-100, higher = more aggressive)
 */
export async function updateSpamLevel(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  spamLevel: number,
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
        spamLevel,
        sess,
        ip,
      }),
    },
  );
  return response?.data as { success: boolean };
}

/**
 * Update from whitelist (replaces entire whitelist)
 * PUT /users/:user
 * @param fromWhitelist - Array of email addresses or domains to whitelist
 */
export async function updateFromWhitelist(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  fromWhitelist: string[],
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
        fromWhitelist,
        sess,
        ip,
      }),
    },
  );
  return response?.data as { success: boolean };
}

/**
 * Add email address or domain to from whitelist
 * GET /users/:user -> PUT /users/:user
 */
export async function addToFromWhitelist(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  emailOrDomain: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const settings = await getSpamSettings(networkClient, config, userId);
  const currentWhitelist = settings.fromWhitelist || [];

  // Avoid duplicates
  if (currentWhitelist.includes(emailOrDomain)) {
    return { success: true };
  }

  const updatedWhitelist = [...currentWhitelist, emailOrDomain];
  return updateFromWhitelist(
    networkClient,
    config,
    userId,
    updatedWhitelist,
    sess,
    ip,
  );
}

/**
 * Remove email address or domain from from whitelist
 * GET /users/:user -> PUT /users/:user
 */
export async function removeFromWhitelist(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  emailOrDomain: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const settings = await getSpamSettings(networkClient, config, userId);
  const currentWhitelist = settings.fromWhitelist || [];
  const updatedWhitelist = currentWhitelist.filter(
    (item) => item !== emailOrDomain,
  );
  return updateFromWhitelist(
    networkClient,
    config,
    userId,
    updatedWhitelist,
    sess,
    ip,
  );
}

/**
 * Update both spam level and from whitelist together
 * PUT /users/:user
 */
export async function updateSpamSettings(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  settings: {
    spamLevel?: number;
    fromWhitelist?: string[];
  },
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
        ...settings,
        sess,
        ip,
      }),
    },
  );
  return response?.data as { success: boolean };
}
