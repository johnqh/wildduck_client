import { WildduckAPI } from "../network/wildduck-client";
import type { NetworkClient, Optional } from "@sudobility/types";
import type {
  EmailFilter,
  FilterAction,
  FilterQuery,
  FilterResponse,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/mail_box_types";

/**
 * Parameters for creating/updating a filter
 */
export interface FilterParams {
  name: string;
  query: FilterQuery;
  action: FilterAction;
  disabled?: boolean;
  sess?: string;
  ip?: string;
}

/**
 * Get all filters for a user
 * GET /users/:user/filters
 */
export async function getFilters(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
): Promise<EmailFilter[]> {
  const api = new WildduckAPI(networkClient, config);
  const data = await api.getFilters(wildduckUserAuth);
  return data.results || [];
}

/**
 * Get a specific filter by ID
 * GET /users/:user/filters/:filter
 */
export async function getFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  filterId: string,
): Promise<Optional<EmailFilter>> {
  // Note: WildduckAPI doesn't have a getFilter method, so keeping basic implementation
  // This function is rarely used and can be added to WildduckAPI later if needed
  const filters = await getFilters(networkClient, config, wildduckUserAuth);
  return filters.find((f) => f.id === filterId) || null;
}

/**
 * Create a new filter
 * POST /users/:user/filters
 */
export async function createFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  params: FilterParams,
): Promise<FilterResponse> {
  const api = new WildduckAPI(networkClient, config);
  return api.createFilter(wildduckUserAuth, params);
}

/**
 * Update an existing filter
 * PUT /users/:user/filters/:filter
 */
export async function updateFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  filterId: string,
  params: Partial<FilterParams>,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.updateFilter(wildduckUserAuth, filterId, params);
}

/**
 * Delete a filter
 * DELETE /users/:user/filters/:filter
 */
export async function deleteFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  filterId: string,
): Promise<{ success: boolean }> {
  const api = new WildduckAPI(networkClient, config);
  return api.deleteFilter(wildduckUserAuth, filterId);
}

/**
 * Enable a filter
 * PUT /users/:user/filters/:filter
 */
export async function enableFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  filterId: string,
): Promise<{ success: boolean }> {
  return updateFilter(networkClient, config, wildduckUserAuth, filterId, {
    disabled: false,
  });
}

/**
 * Disable a filter
 * PUT /users/:user/filters/:filter
 */
export async function disableFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  filterId: string,
): Promise<{ success: boolean }> {
  return updateFilter(networkClient, config, wildduckUserAuth, filterId, {
    disabled: true,
  });
}
