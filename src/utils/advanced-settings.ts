import { WildduckAPI } from "../network/wildduck-client";
import type { NetworkClient } from "@sudobility/types";
import type {
  AdvancedSettings,
  SMTPRelay,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/mail_box_types";

/**
 * Get advanced settings (uploadSentMessages flag from user info)
 * GET /users/:user
 */
export async function getAdvancedSettings(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<AdvancedSettings> {
  const api = new WildduckAPI(networkClient, config);
  const data = await api.getUserSettings(wildduckUserAuth);
  return {
    success: data.success,
    uploadSentMessages: data.uploadSentMessages,
  };
}

/**
 * Update "upload sent messages" setting
 * PUT /users/:user
 * When enabled, messages sent through SMTP are automatically uploaded to the Sent folder
 */
export async function updateUploadSentMessages(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  uploadSentMessages: boolean,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateUserSettings(wildduckUserAuth, { uploadSentMessages });
}

/**
 * Get SMTP relay settings for a user
 * GET /users/:user (mtaRelay is part of user object)
 *
 * Wildduck stores mtaRelay as a URL string like "smtp://host:port" or "smtps://host:port"
 * The secure protocol (smtps://) indicates TLS should be used
 */
export async function getSMTPRelay(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<SMTPRelay> {
  const api = new WildduckAPI(networkClient, config);
  try {
    const data = await api.getUserSettings(wildduckUserAuth);
    const mtaRelay = data.mtaRelay;

    if (!mtaRelay) {
      return { enabled: false };
    }

    // Parse the mtaRelay URL (e.g., "smtp://user:pass@host:port" or "smtps://host:port")
    try {
      const url = new URL(mtaRelay);
      const secure = url.protocol === "smtps:";
      const port = url.port ? parseInt(url.port) : secure ? 465 : 587;

      return {
        enabled: true,
        host: url.hostname,
        port,
        secure,
        ...(url.username && {
          auth: {
            user: decodeURIComponent(url.username),
            pass: decodeURIComponent(url.password || ""),
          },
        }),
      };
    } catch {
      return { enabled: false };
    }
  } catch {
    return { enabled: false };
  }
}

/**
 * Update SMTP relay settings
 * PUT /users/:user with mtaRelay parameter
 *
 * @param host - SMTP server hostname
 * @param port - SMTP server port (25, 465, 587)
 * @param secure - Use TLS encryption
 * @param auth - SMTP authentication credentials
 *
 * Wildduck expects mtaRelay as a URL string: "smtp://host:port" or "smtps://host:port"
 * - Use "smtps://" for secure connections
 * - Include auth in URL: "smtp://user:pass@host:port"
 * - To disable/delete, set mtaRelay to empty string
 */
export async function updateSMTPRelay(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  settings: {
    enabled: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  },
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);

  let mtaRelay: string | undefined = undefined;

  if (settings.enabled && settings.host && settings.port) {
    const protocol = settings.secure ? "smtps" : "smtp";
    const port = settings.port;

    if (settings.auth && settings.auth.user) {
      // Include authentication in URL
      const user = encodeURIComponent(settings.auth.user);
      const pass = encodeURIComponent(settings.auth.pass || "");
      mtaRelay = `${protocol}://${user}:${pass}@${settings.host}:${port}`;
    } else {
      // No authentication
      mtaRelay = `${protocol}://${settings.host}:${port}`;
    }
  } else {
    // If disabled or incomplete settings, set to empty string to clear
    mtaRelay = "";
  }

  return api.updateUserSettings(wildduckUserAuth, { mtaRelay });
}

/**
 * Enable SMTP relay with configuration
 * PUT /users/:user/smtp
 */
export async function enableSMTPRelay(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  relay: {
    host: string;
    port: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  },
): Promise<{ success: boolean }> {
  return updateSMTPRelay(networkClient, config, wildduckUserAuth, {
    enabled: true,
    ...relay,
  });
}

/**
 * Disable SMTP relay
 * PUT /users/:user/smtp
 */
export async function disableSMTPRelay(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<{ success: boolean }> {
  return updateSMTPRelay(networkClient, config, wildduckUserAuth, {
    enabled: false,
  });
}

/**
 * Delete SMTP relay configuration
 * PUT /users/:user with empty mtaRelay
 *
 * In Wildduck, you delete the mtaRelay by setting it to an empty string
 */
export async function deleteSMTPRelay(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateUserSettings(wildduckUserAuth, { mtaRelay: "" });
}
