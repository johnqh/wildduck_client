import type {
  AutoReplySettings,
  WildduckConfig,
} from "../types/wildduck-types";
import { createWildduckClient } from "./client";

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
  config: WildduckConfig,
  userId: string,
): Promise<AutoReplySettings> {
  const client = createWildduckClient(config);
  const response = await client.get<any>(`/users/${userId}/autoreply`);
  return response.data;
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
  config: WildduckConfig,
  userId: string,
  params: UpdateAutoReplyParams,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);
  const response = await client.put<any>(`/users/${userId}/autoreply`, params);
  return response.data;
}

/**
 * Enable auto-reply with default message
 * PUT /users/:user/autoreply
 */
export async function enableAutoReply(
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
  return updateAutoReply(config, userId, params);
}

/**
 * Disable auto-reply
 * PUT /users/:user/autoreply
 */
export async function disableAutoReply(
  config: WildduckConfig,
  userId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const params: any = { status: false };
  if (sess) params.sess = sess;
  if (ip) params.ip = ip;
  return updateAutoReply(config, userId, params);
}

/**
 * Delete auto-reply settings
 * DELETE /users/:user/autoreply
 */
export async function deleteAutoReply(
  config: WildduckConfig,
  userId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);
  const response = await client.delete<any>(`/users/${userId}/autoreply`, {
    data: { sess, ip },
  } as any);
  return response.data;
}
