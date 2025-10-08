/**
 * Integration Test Setup
 *
 * This file provides utilities for integration testing with a live WildDuck server.
 * It handles EVM wallet generation and Sign-in with Ethereum (SIWE) message signing.
 */

import { privateKeyToAccount } from "viem/accounts";

// Environment variables for integration testing
export const INTEGRATION_CONFIG = {
  // WildDuck server endpoint (set via WILDDUCK_ENDPOINT env var)
  endpoint: process.env.WILDDUCK_ENDPOINT || "http://localhost:8080",
  // Email domain for testing
  emailDomain: process.env.WILDDUCK_EMAIL_DOMAIN || "example.com",
  // API token for admin operations (if needed)
  apiToken: process.env.WILDDUCK_API_TOKEN || "",
};

// Test wallet configuration
// Using a deterministic test private key for consistent testing
// WARNING: This is for TESTING ONLY - never use this in production
export const TEST_WALLET = {
  privateKey:
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`,
  // This corresponds to the first Hardhat/Anvil test account
};

/**
 * Generate a wallet account from the test private key
 */
export function getTestAccount() {
  return privateKeyToAccount(TEST_WALLET.privateKey);
}

/**
 * Create a Sign-in with Ethereum (SIWE) message
 * Based on EIP-4361: https://eips.ethereum.org/EIPS/eip-4361
 */
export function createSIWEMessage(params: {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version?: string;
  chainId?: number;
  nonce: string;
  issuedAt?: string;
}): string {
  const {
    domain,
    address,
    statement = "Sign in with Ethereum to WildDuck",
    uri,
    version = "1",
    chainId = 1,
    nonce,
    issuedAt = new Date().toISOString(),
  } = params;

  return `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${uri}
Version: ${version}
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;
}

/**
 * Sign a SIWE message with the test wallet
 */
export async function signSIWEMessage(message: string): Promise<string> {
  const account = getTestAccount();

  // Sign the message directly using the account
  const signature = await account.signMessage({
    message,
  });

  return signature;
}

/**
 * Generate authentication payload for WildDuck /authenticate endpoint
 */
export async function generateAuthPayload(params: {
  username: string;
  emailDomain?: string;
  nonce?: string;
}) {
  const account = getTestAccount();
  const walletAddress = account.address;

  // Generate a random nonce if not provided
  const nonce = params.nonce || Math.random().toString(36).substring(7);

  const emailDomain = params.emailDomain || INTEGRATION_CONFIG.emailDomain;
  const domain = new URL(INTEGRATION_CONFIG.endpoint).hostname;

  // Create SIWE message
  const message = createSIWEMessage({
    domain,
    address: walletAddress,
    uri: INTEGRATION_CONFIG.endpoint,
    nonce,
  });

  // Sign the message
  const signature = await signSIWEMessage(message);

  return {
    username: params.username,
    signature,
    nonce,
    message,
    signer: walletAddress,
    emailDomain,
  };
}

/**
 * Get the test wallet address
 */
export function getTestWalletAddress(): string {
  const account = getTestAccount();
  return account.address;
}

/**
 * Create a test email address using the wallet address
 * Format: {walletAddress}@{emailDomain}
 */
export function getTestEmailAddress(): string {
  const walletAddress = getTestWalletAddress();
  return `${walletAddress}@${INTEGRATION_CONFIG.emailDomain}`;
}

/**
 * Check if integration tests should run
 * Integration tests only run if WILDDUCK_ENDPOINT is set
 */
export function shouldRunIntegrationTests(): boolean {
  return !!process.env.WILDDUCK_ENDPOINT;
}

/**
 * Skip test if integration environment is not configured
 */
export function skipIfNoIntegrationEnv() {
  if (!shouldRunIntegrationTests()) {
    return {
      skip: true,
      reason: "WILDDUCK_ENDPOINT not set - skipping integration test",
    };
  }
  return { skip: false };
}
