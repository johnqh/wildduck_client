import { WildduckAPI } from "../network/wildduck-client";
import type { NetworkClient } from "@sudobility/types";
import type {
  ForwardingTarget,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/mail_box_types";

/**
 * Get current forwarding targets for a user
 * GET /users/:user
 */
export async function getForwardingTargets(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<ForwardingTarget[]> {
  const api = new WildduckAPI(networkClient, config);
  const data = await api.getForwardingTargets(wildduckUserAuth);
  return data.targets || [];
}

/**
 * Update forwarding targets (replaces entire targets array)
 * PUT /users/:user
 */
export async function updateForwardingTargets(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  targets: ForwardingTarget[],
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateUserSettings(wildduckUserAuth, { targets });
}

/**
 * Add a single forwarding target to existing targets
 * GET /users/:user -> PUT /users/:user
 */
export async function addForwardingTarget(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  target: ForwardingTarget,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.addForwardingTarget(wildduckUserAuth, target);
}

/**
 * Remove a forwarding target by value
 * GET /users/:user -> PUT /users/:user
 */
export async function removeForwardingTarget(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  target: ForwardingTarget,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.removeForwardingTarget(wildduckUserAuth, target);
}
