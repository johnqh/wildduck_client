import {
  EmailFilter,
  FilterAction,
  FilterQuery,
  FilterResponse,
  Optional,
  WildDuckConfig,
} from "@johnqh/types";
import { createWildDuckClient } from "./client";

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
  config: WildDuckConfig,
  userId: string,
): Promise<EmailFilter[]> {
  const client = createWildDuckClient(config);
  const response = await client.get<any>(`/users/${userId}/filters`);
  return response.data.results || [];
}

/**
 * Get a specific filter by ID
 * GET /users/:user/filters/:filter
 */
export async function getFilter(
  config: WildDuckConfig,
  userId: string,
  filterId: string,
): Promise<Optional<EmailFilter>> {
  const client = createWildDuckClient(config);
  try {
    const response = await client.get<any>(
      `/users/${userId}/filters/${filterId}`,
    );
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Create a new filter
 * POST /users/:user/filters
 */
export async function createFilter(
  config: WildDuckConfig,
  userId: string,
  params: FilterParams,
): Promise<FilterResponse> {
  const client = createWildDuckClient(config);
  const response = await client.post<any>(`/users/${userId}/filters`, params);
  return response.data;
}

/**
 * Update an existing filter
 * PUT /users/:user/filters/:filter
 */
export async function updateFilter(
  config: WildDuckConfig,
  userId: string,
  filterId: string,
  params: Partial<FilterParams>,
): Promise<{ success: boolean }> {
  const client = createWildDuckClient(config);
  const response = await client.put<any>(
    `/users/${userId}/filters/${filterId}`,
    params,
  );
  return response.data;
}

/**
 * Delete a filter
 * DELETE /users/:user/filters/:filter
 */
export async function deleteFilter(
  config: WildDuckConfig,
  userId: string,
  filterId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const client = createWildDuckClient(config);
  const response = await client.delete<any>(
    `/users/${userId}/filters/${filterId}`,
    {
      data: { sess, ip },
    } as any,
  );
  return response.data;
}

/**
 * Enable a filter
 * PUT /users/:user/filters/:filter
 */
export async function enableFilter(
  config: WildDuckConfig,
  userId: string,
  filterId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const params: any = { disabled: false };
  if (sess) params.sess = sess;
  if (ip) params.ip = ip;
  return updateFilter(config, userId, filterId, params);
}

/**
 * Disable a filter
 * PUT /users/:user/filters/:filter
 */
export async function disableFilter(
  config: WildDuckConfig,
  userId: string,
  filterId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const params: any = { disabled: true };
  if (sess) params.sess = sess;
  if (ip) params.ip = ip;
  return updateFilter(config, userId, filterId, params);
}
