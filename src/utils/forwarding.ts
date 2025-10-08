import { ForwardingTarget, WildDuckConfig } from "@johnqh/types";
import { createWildDuckClient } from "./client";

/**
 * Get current forwarding targets for a user
 * GET /users/:user
 */
export async function getForwardingTargets(
  config: WildDuckConfig,
  userId: string,
): Promise<ForwardingTarget[]> {
  const client = createWildDuckClient(config);
  const response = await client.get<any>(`/users/${userId}`);
  return response.data.targets || [];
}

/**
 * Update forwarding targets (replaces entire targets array)
 * PUT /users/:user
 */
export async function updateForwardingTargets(
  config: WildDuckConfig,
  userId: string,
  targets: ForwardingTarget[],
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildDuckClient(config);
  const response = await client.put<any>(`/users/${userId}`, {
    targets,
    sess,
    ip,
  });
  return response.data;
}

/**
 * Add a single forwarding target to existing targets
 * GET /users/:user -> PUT /users/:user
 */
export async function addForwardingTarget(
  config: WildDuckConfig,
  userId: string,
  target: ForwardingTarget,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const currentTargets = await getForwardingTargets(config, userId);

  // Avoid duplicates
  if (currentTargets.includes(target)) {
    return { success: true };
  }

  const updatedTargets = [...currentTargets, target];
  return updateForwardingTargets(config, userId, updatedTargets, sess, ip);
}

/**
 * Remove a forwarding target by value
 * GET /users/:user -> PUT /users/:user
 */
export async function removeForwardingTarget(
  config: WildDuckConfig,
  userId: string,
  target: ForwardingTarget,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const currentTargets = await getForwardingTargets(config, userId);
  const updatedTargets = currentTargets.filter((t) => t !== target);
  return updateForwardingTargets(config, userId, updatedTargets, sess, ip);
}
