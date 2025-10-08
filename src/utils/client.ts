import axios from "axios";
import { WildDuckConfig } from "@johnqh/types";

/**
 * Create an axios instance configured for WildDuck API
 * The apiToken should be the user's authentication token from /authenticate endpoint
 * with token=true parameter, NOT the master API token
 */
export function createWildDuckClient(
  config: WildDuckConfig,
): ReturnType<typeof axios.create> {
  return axios.create({
    baseURL: config.backendUrl,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
  });
}
