import { WildduckAPI } from "../network/wildduck-client";
import type { NetworkClient } from "@sudobility/types";
import type {
  AutoReplySettings,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/mail_box_types";

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
  wildduckUserAuth: WildduckUserAuth,
): Promise<AutoReplySettings> {
  const api = new WildduckAPI(networkClient, config);
  return api.getAutoreply(wildduckUserAuth) as Promise<AutoReplySettings>;
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
  wildduckUserAuth: WildduckUserAuth,
  params: UpdateAutoReplyParams,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateAutoreply(wildduckUserAuth, params as any);
}

/**
 * Enable auto-reply with default message
 * PUT /users/:user/autoreply
 */
export async function enableAutoReply(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
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
): Promise<{ success: boolean }> {
  const params: UpdateAutoReplyParams = {
    status: true,
    ...message,
    ...schedule,
  };
  return updateAutoReply(networkClient, config, wildduckUserAuth, params);
}

/**
 * Disable auto-reply
 * PUT /users/:user/autoreply
 */
export async function disableAutoReply(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<{ success: boolean }> {
  return updateAutoReply(networkClient, config, wildduckUserAuth, {
    status: false,
  });
}

/**
 * Delete auto-reply settings
 * DELETE /users/:user/autoreply
 */
export async function deleteAutoReply(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.deleteAutoreply(wildduckUserAuth);
}
