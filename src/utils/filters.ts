import type { Optional } from "@sudobility/types";
import type {
  EmailFilter,
  FilterAction,
  FilterQuery,
  FilterResponse,
  NetworkClient,
  WildduckConfig,
} from "@sudobility/types";

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
  userId: string,
): Promise<EmailFilter[]> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<any>(
    `${apiUrl}/users/${userId}/filters`,
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
  return data.results || [];
}

/**
 * Get a specific filter by ID
 * GET /users/:user/filters/:filter
 */
export async function getFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  filterId: string,
): Promise<Optional<EmailFilter>> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  try {
    const response = await networkClient.request<any>(
      `${apiUrl}/users/${userId}/filters/${filterId}`,
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
    return response?.data as EmailFilter;
  } catch {
    return null;
  }
}

/**
 * Create a new filter
 * POST /users/:user/filters
 */
export async function createFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  params: FilterParams,
): Promise<FilterResponse> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<FilterResponse>(
    `${apiUrl}/users/${userId}/filters`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.cloudflareWorkerUrl
          ? {
              Authorization: `Bearer ${config.apiToken}`,
              "X-App-Source": "0xmail-box",
            }
          : { "X-Access-Token": config.apiToken }),
      },
      body: JSON.stringify(params),
    },
  );
  return response?.data as FilterResponse;
}

/**
 * Update an existing filter
 * PUT /users/:user/filters/:filter
 */
export async function updateFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  filterId: string,
  params: Partial<FilterParams>,
): Promise<{ success: boolean }> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<{ success: boolean }>(
    `${apiUrl}/users/${userId}/filters/${filterId}`,
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
      body: JSON.stringify(params),
    },
  );
  return response?.data as { success: boolean };
}

/**
 * Delete a filter
 * DELETE /users/:user/filters/:filter
 */
export async function deleteFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  filterId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
  const response = await networkClient.request<{ success: boolean }>(
    `${apiUrl}/users/${userId}/filters/${filterId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(config.cloudflareWorkerUrl
          ? {
              Authorization: `Bearer ${config.apiToken}`,
              "X-App-Source": "0xmail-box",
            }
          : { "X-Access-Token": config.apiToken }),
      },
      body: JSON.stringify({ sess, ip }),
    },
  );
  return response?.data as { success: boolean };
}

/**
 * Enable a filter
 * PUT /users/:user/filters/:filter
 */
export async function enableFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  filterId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const params: any = { disabled: false };
  if (sess) params.sess = sess;
  if (ip) params.ip = ip;
  return updateFilter(networkClient, config, userId, filterId, params);
}

/**
 * Disable a filter
 * PUT /users/:user/filters/:filter
 */
export async function disableFilter(
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  filterId: string,
  sess?: string,
  ip?: string,
): Promise<{ success: boolean }> {
  const params: any = { disabled: true };
  if (sess) params.sess = sess;
  if (ip) params.ip = ip;
  return updateFilter(networkClient, config, userId, filterId, params);
}
