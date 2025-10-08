# Integration Tests Setup

This document describes the integration test setup for the WildDuck client library.

## Overview

Integration tests have been added to test the WildDuck client against a live WildDuck server running in crypto mode. These tests use EVM wallet signatures for authentication.

## Files Created

### Test Files
- `src/__tests__/integration/setup.ts` - Test utilities and configuration
- `src/__tests__/integration/wildduck-api.integration.test.ts` - Main integration test suite
- `src/__tests__/integration/README.md` - Detailed integration test documentation

### Configuration
- `vitest.integration.config.ts` - Vitest configuration for integration tests
- `.env.example` - Example environment variables

## Environment Variables

Create a `.env` file or set these environment variables to run integration tests:

```bash
# Required - Tests will be skipped if not set
WILDDUCK_ENDPOINT=http://localhost:8080

# Optional
WILDDUCK_EMAIL_DOMAIN=example.com
WILDDUCK_API_TOKEN=your-api-token
```

## Running Integration Tests

### Basic usage
```bash
WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration
```

### With custom email domain
```bash
WILDDUCK_ENDPOINT=http://localhost:8080 WILDDUCK_EMAIL_DOMAIN=0xmail.box npm run test:integration
```

### Watch mode
```bash
WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration:watch
```

## Test Wallet

The tests use a deterministic test wallet:
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

**⚠️ This is the first account from Hardhat/Anvil's test mnemonic. For testing only!**

## Authentication Flow

1. Generate EVM wallet using viem
2. Create SIWE (Sign-in with Ethereum) message following EIP-4361
3. Sign message with private key
4. Send authentication request with:
   - `username`: Email address (format: `{walletAddress}@{emailDomain}`)
   - `signature`: The cryptographic signature
   - `nonce`: Random nonce
   - `message`: The SIWE message that was signed
   - `signer`: The wallet address

## Test Coverage

The integration tests cover:

### Authentication
- ✓ Crypto signature-based authentication
- ✓ Invalid signature handling

### User Operations
- ✓ Get user information
- ✓ Update user settings
- ✓ Get user limits

### Mailbox Operations
- ✓ List mailboxes
- ✓ Get specific mailbox
- ✓ Create and delete mailboxes

### Message Operations
- ✓ List messages
- ✓ Upload, retrieve, and delete messages
- ✓ Submit messages for delivery

### Autoreply Operations
- ✓ Get autoreply status
- ✓ Enable and disable autoreply

## NPM Scripts

New scripts added to `package.json`:

```json
{
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:integration:watch": "vitest --config vitest.integration.config.ts"
}
```

## Dependencies

- **viem** (^2.38.0) - For EVM wallet signing and SIWE message generation

## Skip Behavior

Tests automatically skip when `WILDDUCK_ENDPOINT` is not set, making them safe to run in CI/CD without configuration.

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run Integration Tests
  if: env.WILDDUCK_ENDPOINT != ''
  env:
    WILDDUCK_ENDPOINT: ${{ secrets.WILDDUCK_ENDPOINT }}
    WILDDUCK_EMAIL_DOMAIN: ${{ secrets.WILDDUCK_EMAIL_DOMAIN }}
  run: npm run test:integration
```

## Next Steps

1. Configure your WildDuck server endpoint
2. Set environment variables
3. Run the tests to verify your setup
4. Add more tests as needed for your specific use cases

For more detailed information, see `src/__tests__/integration/README.md`.
