# WildDuck Client Library

TypeScript client library for the WildDuck email API with React and React Native support.

[![npm version](https://badge.fury.io/js/@sudobility%2Fwildduck_client.svg)](https://www.npmjs.com/package/@sudobility/wildduck_client)
[![CI/CD](https://github.com/0xmail/wildduck_client/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/0xmail/wildduck_client/actions/workflows/ci-cd.yml)

## Features

- ✅ **Complete Type Safety** - Full TypeScript support with comprehensive type definitions
- ✅ **React Integration** - Built-in hooks using @tanstack/react-query for optimal data fetching
- ✅ **Crypto Authentication** - SIWE (Sign-in with Ethereum) and traditional password authentication
- ✅ **Comprehensive API** - User, mailbox, message, address, filter, and autoreply management
- ✅ **Development Mode** - Mock data for testing without a live server
- ✅ **Integration Tests** - Full test coverage with real WildDuck server testing
- ✅ **Cloudflare Worker Support** - Optional worker URL configuration for proxying requests

## Installation

```bash
npm install @sudobility/wildduck_client
```

### Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install react @tanstack/react-query @sudobility/di @sudobility/types axios
```

## Quick Start

### 1. Authentication

```typescript
import { useWildduckAuth } from '@sudobility/wildduck_client';

function LoginComponent() {
  const networkClient = useNetworkClient();
  const config = { endpoint: 'https://api.wildduck.example.com' };

  const { authenticate, isAuthenticated } = useWildduckAuth(
    networkClient,
    config
  );

  // Authenticate with crypto signature (SIWE)
  const handleCryptoLogin = async () => {
    await authenticate({
      username: 'user@example.com',
      signature: '0x...',
      message: 'Sign-in with Ethereum message',
      nonce: 'random-nonce',
      signer: '0xWalletAddress'
    });
  };

  // Or authenticate with password
  const handlePasswordLogin = async () => {
    await authenticate({
      username: 'user@example.com',
      password: 'your-password'
    });
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Logged in!</p>
      ) : (
        <>
          <button onClick={handleCryptoLogin}>Login with Wallet</button>
          <button onClick={handlePasswordLogin}>Login with Password</button>
        </>
      )}
    </div>
  );
}
```

### 2. Fetching Messages

```typescript
import { useWildduckGetMessages } from '@sudobility/wildduck_client';

function MessageList({ userAuth, mailboxId }) {
  const networkClient = useNetworkClient();
  const config = { endpoint: 'https://api.wildduck.example.com' };

  const { getMessages } = useWildduckGetMessages(networkClient, config);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    async function fetchMessages() {
      const result = await getMessages(userAuth, mailboxId, {
        limit: 50,
        unseen: true, // Only unread messages
        order: 'desc'
      });
      setMessages(result.results);
    }
    fetchMessages();
  }, [mailboxId]);

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <h3>{msg.subject}</h3>
          <p>From: {msg.from.address}</p>
          <span>{msg.unseen ? '🔵 Unread' : '✓ Read'}</span>
        </div>
      ))}
    </div>
  );
}
```

### 3. Sending Messages

```typescript
import { useWildduckSendMessage } from '@sudobility/wildduck_client';

function ComposeEmail({ userAuth }) {
  const networkClient = useNetworkClient();
  const config = { endpoint: 'https://api.wildduck.example.com' };

  const { sendMessage } = useWildduckSendMessage(networkClient, config);

  const handleSend = async () => {
    await sendMessage(userAuth, {
      to: [{ name: 'John Doe', address: 'john@example.com' }],
      subject: 'Hello from WildDuck Client',
      text: 'This is a test message',
      html: '<p>This is a <strong>test</strong> message</p>'
    });
  };

  return <button onClick={handleSend}>Send Email</button>;
}
```

## API Coverage

Currently implements ~15% of the WildDuck API endpoints (see [docs/GAP_ANALYSIS.md](./docs/GAP_ANALYSIS.md) for details):

### Implemented Endpoints

| Category | Status | Coverage |
|----------|--------|----------|
| Authentication | ✅ Complete | 100% |
| Users | ⚠️ Partial | ~12% |
| Mailboxes | ✅ Mostly Complete | 80% |
| Messages | ⚠️ Partial | ~31% |
| Addresses | ✅ Mostly Complete | 64% |
| Filters | ✅ Complete | 100% |
| Autoreply | ⚠️ Partial | ~67% |
| Health | ✅ Complete | 100% |
| Settings | ✅ Mostly Complete | 67% |

### Priority Features to Implement

See [docs/GAP_ANALYSIS.md](./docs/GAP_ANALYSIS.md) for a comprehensive breakdown of missing endpoints and implementation priorities.

## Available Hooks

### Messages
- `useWildduckGetMessages` - List messages in a mailbox
- `useWildduckGetMessage` - Get a single message
- `useWildduckUpdateMessage` - Update message properties (mark as read, move, flag)
- `useWildduckDeleteMessage` - Delete a message
- `useWildduckSearchMessages` - Search messages across mailboxes
- `useWildduckGetMessageSource` - Get raw RFC822 message source
- `useWildduckGetMessageAttachment` - Download message attachment
- `useWildduckForwardMessage` - Forward a message
- `useWildduckSendMessage` - Send a new email
- `useWildduckUploadMessage` - Upload raw message to mailbox
- `useWildduckSubmitDraft` - Submit a draft for delivery

### Mailboxes
- `useWildduckGetMailboxes` - List all mailboxes
- `useWildduckGetMailbox` - Get specific mailbox info
- `useWildduckCreateMailbox` - Create new mailbox/folder
- `useWildduckUpdateMailbox` - Update mailbox properties
- `useWildduckDeleteMailbox` - Delete a mailbox

### Users
- `useWildduckGetUser` - Get user information
- `useWildduckCreateUser` - Create new user (admin)
- `useWildduckUpdateUser` - Update user settings
- `useWildduckDeleteUser` - Delete user account

### Addresses
- `useWildduckGetAddresses` - List user's email addresses
- Additional address management hooks

### Autoreply
- `useWildduckGetAutoreply` - Get autoreply settings
- `useWildduckUpdateAutoreply` - Update autoreply (vacation mode)
- `useWildduckDeleteAutoreply` - Delete autoreply

### Filters
- Complete filter management hooks

### Other
- `useWildduckHealth` - Server health check
- `useWildduckSettings` - Settings management

For detailed documentation on all hooks, see [docs/HOOKS_DOCUMENTATION.md](./docs/HOOKS_DOCUMENTATION.md).

## Development

### Setup

```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run unit tests
npm test

# Run integration tests (requires WildDuck server)
WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration

# Build the library
npm run build
```

### Development Scripts

```bash
npm run build              # Build for production
npm run build:watch        # Build in watch mode
npm run clean              # Clean build artifacts
npm run test               # Run tests in watch mode
npm run test:run           # Run tests once
npm run test:coverage      # Run tests with coverage
npm run test:integration   # Run integration tests
npm run lint               # Run ESLint
npm run lint:fix           # Fix linting issues
npm run format             # Format code with Prettier
npm run typecheck          # Run TypeScript type checking
npm run check-all          # Run all checks (lint + typecheck + test)
```

## Testing

### Unit Tests

```bash
npm run test:run
```

### Integration Tests

Integration tests require a live WildDuck server running in crypto mode:

```bash
# Set required environment variables
export WILDDUCK_ENDPOINT=http://localhost:8080
export WILDDUCK_EMAIL_DOMAIN=example.com  # Optional

# Run integration tests
npm run test:integration
```

For more details, see [docs/INTEGRATION_TESTS.md](./docs/INTEGRATION_TESTS.md).

## Documentation

- **[docs/HOOKS_DOCUMENTATION.md](./docs/HOOKS_DOCUMENTATION.md)** - Comprehensive hook documentation with examples
- **[docs/WILDDUCK_API_ENDPOINTS.md](./docs/WILDDUCK_API_ENDPOINTS.md)** - Complete API endpoint reference
- **[docs/GAP_ANALYSIS.md](./docs/GAP_ANALYSIS.md)** - Analysis of implemented vs. missing endpoints
- **[docs/INTEGRATION_TESTS.md](./docs/INTEGRATION_TESTS.md)** - Integration testing guide
- **[docs/CI_CD_SETUP.md](./docs/CI_CD_SETUP.md)** - CI/CD workflow documentation
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guide

## Architecture

```
wildduck_client/
├── src/
│   ├── network/          # API client and HTTP layer
│   ├── hooks/            # React hooks for data fetching
│   │   ├── messages/     # Message-related hooks
│   │   ├── mailboxes/    # Mailbox-related hooks
│   │   ├── addresses/    # Address-related hooks
│   │   ├── autoreply/    # Autoreply-related hooks
│   │   └── users/        # User-related hooks
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── __tests__/        # Test files
│       └── integration/  # Integration tests
├── dist/                 # Compiled output
└── docs/                 # Documentation files
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run checks: `npm run check-all`
5. Commit your changes: `git commit -m "Add my feature"`
6. Push to the branch: `git push origin feature/my-feature`
7. Open a pull request

### Code Quality

This project maintains high code quality standards:

- TypeScript with strict mode enabled
- ESLint for code linting
- Prettier for code formatting
- Comprehensive unit and integration tests
- CI/CD pipeline that runs on every push

## Deployment

### NPM Publishing

The library is automatically published to NPM when you push to the `main` branch:

1. Update version: `npm version patch|minor|major`
2. Push to main: `git push origin main --tags`
3. CI/CD automatically publishes to NPM

For more details, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## License

MIT

## Related Projects

- [WildDuck](https://github.com/nodemailer/wildduck) - The WildDuck email server
- [@sudobility/types](https://www.npmjs.com/package/@sudobility/types) - Shared type definitions

## Support

- [GitHub Issues](https://github.com/0xmail/wildduck_client/issues)
- [API Documentation](https://docs.wildduck.email/api/)

## Changelog

See [GitHub Releases](https://github.com/0xmail/wildduck_client/releases) for version history and release notes.
