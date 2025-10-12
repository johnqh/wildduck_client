import axios from "axios";
import type { WildduckConfig } from "@sudobility/types";

/**
 * Create an axios instance configured for Wildduck API
 * The apiToken should be the user's authentication token from /authenticate endpoint
 * with token=true parameter, NOT the master API token
 */
export function createWildduckClient(
  config: WildduckConfig,
): ReturnType<typeof axios.create> {
  return axios.create({
    baseURL: config.backendUrl,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
  });
}
