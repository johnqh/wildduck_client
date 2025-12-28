import { WildduckAPI } from "../network/wildduck-client";
import type { NetworkClient } from "@sudobility/types";
import type {
  UserInfo,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/mail_box_types";

/**
 * Get user information
 * GET /users/:user
 */
export async function getUserInfo(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<UserInfo> {
  const api = new WildduckAPI(networkClient, config);
  const userData = await api.getUser(wildduckUserAuth);
  return userData as unknown as UserInfo;
}

/**
 * Update user display name
 * PUT /users/:user
 */
export async function updateUserName(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  name: string,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateUserSettings(wildduckUserAuth, { name });
}

/**
 * Update user settings (general purpose)
 * PUT /users/:user
 */
export async function updateUserSettings(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
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
  const api = new WildduckAPI(networkClient, config);
  return api.updateUserSettings(wildduckUserAuth, settings);
}
