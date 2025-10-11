import type { SpamSettings, WildduckConfig } from "@johnqh/types";
import { createWildduckClient } from "./client";

/**
 * Get current spam settings (spam level and from whitelist)
 * GET /users/:user
 */
export async function getSpamSettings(
  config: WildduckConfig,
  userId: string,
): Promise<SpamSettings> {
  const client = createWildduckClient(config);
  const response = await client.get<any>(`/users/${userId}`);
  return {
    success: response.data.success,
    spamLevel: response.data.spamLevel,
    fromWhitelist: response.data.fromWhitelist || [],
  };
}

/**
 * Update spam level
 * PUT /users/:user
 * @param spamLevel - Spam filtering level (0-100, higher = more aggressive)
 */
export async function updateSpamLevel(
  config: WildduckConfig,
  userId: string,
  spamLevel: number,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);
  const response = await client.put<any>(`/users/${userId}`, {
    spamLevel,
    sess,
    ip,
  });
  return response.data;
}

/**
 * Update from whitelist (replaces entire whitelist)
 * PUT /users/:user
 * @param fromWhitelist - Array of email addresses or domains to whitelist
 */
export async function updateFromWhitelist(
  config: WildduckConfig,
  userId: string,
  fromWhitelist: string[],
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);
  const response = await client.put<any>(`/users/${userId}`, {
    fromWhitelist,
    sess,
    ip,
  });
  return response.data;
}

/**
 * Add email address or domain to from whitelist
 * GET /users/:user -> PUT /users/:user
 */
export async function addToFromWhitelist(
  config: WildduckConfig,
  userId: string,
  emailOrDomain: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const settings = await getSpamSettings(config, userId);
  const currentWhitelist = settings.fromWhitelist || [];

  // Avoid duplicates
  if (currentWhitelist.includes(emailOrDomain)) {
    return { success: true };
  }

  const updatedWhitelist = [...currentWhitelist, emailOrDomain];
  return updateFromWhitelist(config, userId, updatedWhitelist, sess, ip);
}

/**
 * Remove email address or domain from from whitelist
 * GET /users/:user -> PUT /users/:user
 */
export async function removeFromWhitelist(
  config: WildduckConfig,
  userId: string,
  emailOrDomain: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const settings = await getSpamSettings(config, userId);
  const currentWhitelist = settings.fromWhitelist || [];
  const updatedWhitelist = currentWhitelist.filter(
    (item) => item !== emailOrDomain,
  );
  return updateFromWhitelist(config, userId, updatedWhitelist, sess, ip);
}

/**
 * Update both spam level and from whitelist together
 * PUT /users/:user
 */
export async function updateSpamSettings(
  config: WildduckConfig,
  userId: string,
  settings: {
    spamLevel?: number;
    fromWhitelist?: string[];
  },
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);
  const response = await client.put<any>(`/users/${userId}`, {
    ...settings,
    sess,
    ip,
  });
  return response.data;
}
