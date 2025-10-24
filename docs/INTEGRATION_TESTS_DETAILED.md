# Wildduck API Integration Tests

This directory contains integration tests that run against a live Wildduck server in crypto mode.

## Prerequisites

1. **Running Wildduck Server**: You need a Wildduck server running in crypto mode
2. **Environment Variables**: Set the required environment variables (see below)

## Environment Variables

### Required

- `WILDDUCK_ENDPOINT` - The URL of your Wildduck server
  - Example: `http://localhost:8080`
  - **Tests will be skipped if this is not set**

### Optional

- `WILDDUCK_EMAIL_DOMAIN` - Email domain for testing (default: `example.com`)
  - Example: `0xmail.box`
- `WILDDUCK_API_TOKEN` - Admin API token if needed for certain operations
  - This is optional and only used for admin-level operations

## Test Wallet

The integration tests use a deterministic test wallet for consistent testing:

- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

This is the first account from Hardhat/Anvil's test mnemonic. **This is for testing only** and should never be used in production.

## Test Email Format

The tests create email addresses in the format: `{walletAddress}@{emailDomain}`

Example: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266@example.com`

## Running Integration Tests

### Run all integration tests

```bash
WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration
```

### Run with custom email domain

```bash
WILDDUCK_ENDPOINT=http://localhost:8080 WILDDUCK_EMAIL_DOMAIN=0xmail.box npm run test:integration
```

### Run in watch mode

```bash
WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration:watch
```

### Run with coverage

```bash
WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration -- --coverage
```

## What Gets Tested

The integration tests cover:

### Authentication
- ✓ Crypto signature-based authentication with SIWE (Sign-in with Ethereum)
- ✓ Invalid signature handling
- ✓ Token generation

### User Operations
- ✓ Get user information
- ✓ Update user settings
- ✓ Get user limits/quotas

### Mailbox Operations
- ✓ List mailboxes
- ✓ Get specific mailbox
- ✓ Create mailbox
- ✓ Delete mailbox

### Message Operations
- ✓ List messages
- ✓ Upload message
- ✓ Get message
- ✓ Delete message
- ✓ Submit message for delivery

### Autoreply Operations
- ✓ Get autoreply status
- ✓ Enable autoreply
- ✓ Disable autoreply

## Authentication Flow

The integration tests use the Wildduck crypto authentication flow:

1. Generate an EVM wallet (using viem)
2. Create a SIWE (Sign-in with Ethereum) message following EIP-4361
3. Sign the message with the private key
4. Send authentication request with:
   - `username`: Email address
   - `signature`: The signature from step 3
   - `nonce`: Random nonce used in the message
   - `message`: The SIWE message that was signed
   - `signer`: The wallet address that created the signature

## Troubleshooting

### Tests are being skipped

Make sure `WILDDUCK_ENDPOINT` is set. The tests will automatically skip if this environment variable is not configured.

### Authentication fails

1. Verify your Wildduck server is running in crypto mode
2. Check that the email domain matches your server configuration
3. Ensure the server accepts the test wallet address

### Connection errors

1. Check that the Wildduck server is accessible at the endpoint URL
2. Verify firewall settings allow connections
3. Check server logs for more details

## CI/CD Integration

For CI/CD pipelines, you can conditionally run integration tests:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  if: env.WILDDUCK_ENDPOINT != ''
  env:
    WILDDUCK_ENDPOINT: ${{ secrets.WILDDUCK_ENDPOINT }}
    WILDDUCK_EMAIL_DOMAIN: ${{ secrets.WILDDUCK_EMAIL_DOMAIN }}
  run: npm run test:integration
```

## Adding New Tests

To add new integration tests:

1. Import the test utilities from `./setup.ts`
2. Use `skipIfNoIntegrationEnv()` to skip tests when environment is not configured
3. Use `generateAuthPayload()` to create authentication payloads
4. Follow the existing test structure for consistency

Example:

```typescript
import { describe, it, expect } from 'vitest';
import { generateAuthPayload, skipIfNoIntegrationEnv } from './setup';

describe('My New Feature', () => {
  const skipCheck = skipIfNoIntegrationEnv();

  if (skipCheck.skip) {
    it.skip(skipCheck.reason, () => {});
    return;
  }

  it('should test my feature', async () => {
    // Your test code here
  });
});
```
