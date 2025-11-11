import { WildduckAPI } from "../network/wildduck-client";
import type {
  NetworkClient,
  SpamSettings,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/types";

/**
 * Get current spam settings (spam level and from whitelist)
 * GET /users/:user
 */
export async function getSpamSettings(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<SpamSettings> {
  const api = new WildduckAPI(networkClient, config);
  const data = await api.getSpamSettings(wildduckUserAuth);
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
  wildduckUserAuth: WildduckUserAuth,
  spamLevel: number,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateSpamLevel(wildduckUserAuth, spamLevel);
}

/**
 * Update from whitelist (replaces entire whitelist)
 * PUT /users/:user
 * @param fromWhitelist - Array of email addresses or domains to whitelist
 */
export async function updateFromWhitelist(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  fromWhitelist: string[],
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateUserSettings(wildduckUserAuth, { fromWhitelist });
}

/**
 * Add email address or domain to from whitelist
 * GET /users/:user -> PUT /users/:user
 */
export async function addToFromWhitelist(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  emailOrDomain: string,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.addToWhitelist(wildduckUserAuth, emailOrDomain);
}

/**
 * Remove email address or domain from from whitelist
 * GET /users/:user -> PUT /users/:user
 */
export async function removeFromWhitelist(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  emailOrDomain: string,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.removeFromWhitelist(wildduckUserAuth, emailOrDomain);
}

/**
 * Update both spam level and from whitelist together
 * PUT /users/:user
 */
export async function updateSpamSettings(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  settings: {
    spamLevel?: number;
    fromWhitelist?: string[];
  },
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateUserSettings(wildduckUserAuth, settings);
}
