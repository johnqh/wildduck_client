import type {
  ForwardingTarget,
  NetworkClient,
  WildduckConfig,
} from "@sudobility/types";

/**
 * Get current forwarding targets for a user
 * GET /users/:user
 */
export async function getForwardingTargets(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
): Promise<ForwardingTarget[]> {
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
  return data.targets || [];
}

/**
 * Update forwarding targets (replaces entire targets array)
 * PUT /users/:user
 */
export async function updateForwardingTargets(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  targets: ForwardingTarget[],
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
        targets,
        sess,
        ip,
      }),
    },
  );
  return response?.data as { success: boolean };
}

/**
 * Add a single forwarding target to existing targets
 * GET /users/:user -> PUT /users/:user
 */
export async function addForwardingTarget(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  target: ForwardingTarget,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const currentTargets = await getForwardingTargets(
    networkClient,
    config,
    userId,
  );

  // Avoid duplicates
  if (currentTargets.includes(target)) {
    return { success: true };
  }

  const updatedTargets = [...currentTargets, target];
  return updateForwardingTargets(
    networkClient,
    config,
    userId,
    updatedTargets,
    sess,
    ip,
  );
}

/**
 * Remove a forwarding target by value
 * GET /users/:user -> PUT /users/:user
 */
export async function removeForwardingTarget(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  target: ForwardingTarget,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const currentTargets = await getForwardingTargets(
    networkClient,
    config,
    userId,
  );
  const updatedTargets = currentTargets.filter((t) => t !== target);
  return updateForwardingTargets(
    networkClient,
    config,
    userId,
    updatedTargets,
    sess,
    ip,
  );
}
