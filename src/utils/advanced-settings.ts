import type {
  AdvancedSettings,
  SMTPRelay,
  WildduckConfig,
} from "@sudobility/types";
import { createWildduckClient } from "./client";

/**
 * Get advanced settings (uploadSentMessages flag from user info)
 * GET /users/:user
 */
export async function getAdvancedSettings(
  config: WildduckConfig,
  userId: string,
): Promise<AdvancedSettings> {
  const client = createWildduckClient(config);
  const response = await client.get<any>(`/users/${userId}`);
  return {
    success: response.data.success,
    uploadSentMessages: response.data.uploadSentMessages,
  };
}

/**
 * Update "upload sent messages" setting
 * PUT /users/:user
 * When enabled, messages sent through SMTP are automatically uploaded to the Sent folder
 */
export async function updateUploadSentMessages(
  config: WildduckConfig,
  userId: string,
  uploadSentMessages: boolean,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);
  const response = await client.put<any>(`/users/${userId}`, {
    uploadSentMessages,
    sess,
    ip,
  });
  return response.data;
}

/**
 * Get SMTP relay settings for a user
 * GET /users/:user (mtaRelay is part of user object)
 *
 * Wildduck stores mtaRelay as a URL string like "smtp://host:port" or "smtps://host:port"
 * The secure protocol (smtps://) indicates TLS should be used
 */
export async function getSMTPRelay(
  config: WildduckConfig,
  userId: string,
): Promise<SMTPRelay> {
  const client = createWildduckClient(config);
  try {
    const response = await client.get<any>(`/users/${userId}`);
    const mtaRelay = response.data.mtaRelay;

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
    } catch (parseError) {
      console.error("Failed to parse mtaRelay URL:", mtaRelay, parseError);
      return { enabled: false };
    }
  } catch (error) {
    console.error("Failed to get SMTP relay settings:", error);
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
  config: WildduckConfig,
  userId: string,
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
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);

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

  const response = await client.put<any>(`/users/${userId}`, {
    mtaRelay,
    sess,
    ip,
  });
  return response.data;
}

/**
 * Enable SMTP relay with configuration
 * PUT /users/:user/smtp
 */
export async function enableSMTPRelay(
  config: WildduckConfig,
  userId: string,
  relay: {
    host: string;
    port: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  },
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  return updateSMTPRelay(
    config,
    userId,
    {
      enabled: true,
      ...relay,
    },
    sess,
    ip,
  );
}

/**
 * Disable SMTP relay
 * PUT /users/:user/smtp
 */
export async function disableSMTPRelay(
  config: WildduckConfig,
  userId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  return updateSMTPRelay(
    config,
    userId,
    {
      enabled: false,
    },
    sess,
    ip,
  );
}

/**
 * Delete SMTP relay configuration
 * PUT /users/:user with empty mtaRelay
 *
 * In Wildduck, you delete the mtaRelay by setting it to an empty string
 */
export async function deleteSMTPRelay(
  config: WildduckConfig,
  userId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildduckClient(config);
  const response = await client.put<any>(`/users/${userId}`, {
    mtaRelay: "",
    sess,
    ip,
  });
  return response.data;
}
