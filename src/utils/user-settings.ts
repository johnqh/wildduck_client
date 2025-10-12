import type { UserInfo, WildduckConfig } from "@sudobility/types";
import { createWildduckClient } from "./client";

/**
 * Get user information
 * GET /users/:user
 */
export async function getUserInfo(
  config: WildduckConfig,
  userId: string,
): Promise<UserInfo> {
  const client = createWildduckClient(config);
  const response = await client.get<UserInfo>(`/users/${userId}`);
  return response.data;
}

/**
 * Update user display name
 * PUT /users/:user
 */
export async function updateUserName(
  config: WildduckConfig,
  userId: string,
  name: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);
  const response = await client.put<any>(`/users/${userId}`, {
    name,
    sess,
    ip,
  });
  return response.data;
}

/**
 * Update user settings (general purpose)
 * PUT /users/:user
 */
export async function updateUserSettings(
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
  const client = createWildduckClient(config);
  const response = await client.put<any>(`/users/${userId}`, settings);
  return response.data;
}
