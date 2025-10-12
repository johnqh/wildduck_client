# WildDuck Client Library - Detailed AI Context

This document provides comprehensive context for AI assistants working on the WildDuck client library.

## Project Purpose

This library provides a TypeScript client for the WildDuck email API, enabling React and React Native applications to interact with WildDuck email servers. It's part of the 0xmail ecosystem, which provides blockchain-based email services.

### Key Use Cases

1. **Web-based email clients** using React
2. **Mobile email apps** using React Native
3. **Email management dashboards** for administrators
4. **Automated email processing** workflows
5. **Integration with blockchain-based authentication** (SIWE/EIP-4361)

## Current State Analysis

### Strengths

1. **Type Safety**: Comprehensive TypeScript types from @johnqh/types package
2. **React Integration**: Well-designed hooks using @tanstack/react-query
3. **Authentication**: Supports both traditional (password) and modern (crypto signature) auth
4. **Testing**: Good test coverage with both unit and integration tests
5. **Documentation**: Extensive API and hook documentation
6. **CI/CD**: Automated testing and deployment pipeline

### Weaknesses & Gaps

1. **API Coverage**: Only ~15% of WildDuck API implemented
2. **Missing Critical Features**:
   - User registration/creation
   - Autoreply management (vacation mode)
   - Application-Specific Passwords (ASPs)
   - File storage operations
   - Attachment downloads
   - Message draft uploads
3. **No README**: Missing until recently (now fixed)
4. **Documentation Scattered**: Multiple MD files without clear navigation

### Priority Implementation Order

Based on GAP_ANALYSIS.md, implement in this order:

1. **Critical** (Weeks 1-2):
   - `POST /users` - User registration
   - `POST /users/:user/mailboxes/:mailbox/messages` - Upload messages (drafts)
   - `GET /users/:user/mailboxes/:mailbox/messages/:message/attachments/:attachment` - Download attachments
   - `GET /users/:user/mailboxes/:mailbox/messages/:message` - Full message with metadata

2. **High** (Weeks 3-4):
   - Autoreply endpoints (GET/PUT/DELETE `/users/:user/autoreply`)
   - `POST /users/:user/search` - Bulk message operations
   - Message forwarding and draft submission
   - Raw message source access

3. **Medium** (Weeks 5-8):
   - User updates (`PUT /users/:user`)
   - ASP management endpoints
   - Storage endpoints (file upload/download)
   - Webhook management

## Technical Architecture

### Data Flow

```
User Action
    ↓
React Component
    ↓
useWildduck[Feature] Hook
    ↓
NetworkClient (axios)
    ↓
[Optional: Cloudflare Worker Proxy]
    ↓
WildDuck API Server
    ↓
MongoDB Database
```

### Hook Pattern Details

Every hook follows this structure:

```typescript
export function useWildduck<Feature><Action>(
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode?: boolean
) {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<ResponseType | null>(null);

  // Action function
  const actionName = async (
    userAuth: WildduckUserAuth,
    ...params
  ): Promise<ResponseType> => {
    try {
      setLoading(true);
      setError(null);

      // Development mode mock data
      if (devMode) {
        return getMockData();
      }

      // Actual API call
      const result = await networkClient.apiMethod(userAuth, ...params);
      setData(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { actionName, loading, error, data };
}
```

### Network Client Layer

Located in `src/network/wildduck-client.ts`:

- Handles HTTP communication with WildDuck API
- Manages authentication headers
- Supports optional Cloudflare Worker proxying
- Provides typed methods for each endpoint
- Centralizes error handling

### Type System

Types are defined in two places:

1. **@johnqh/types package**: Shared types across 0xmail projects
   - `WildduckUserAuth`
   - `WildDuckMessage`
   - `WildDuckMailbox`
   - And many more...

2. **Local src/types/**: Project-specific types
   - Hook-specific request/response types
   - Utility types
   - Augmentations of imported types

## Development Patterns

### Adding a New Endpoint

**Step 1: Check Specification**
- Review WILDDUCK_API_ENDPOINTS.md for exact API spec
- Note: method, path, request body, query params, response shape

**Step 2: Add/Verify Types**
```typescript
// In @johnqh/types or src/types/
export interface CreateUserRequest {
  username: string;
  password: string;
  address?: string;
  name?: string;
  // ... other fields
}

export interface CreateUserResponse {
  success: boolean;
  id: string;
}
```

**Step 3: Add Network Method**
```typescript
// In src/network/wildduck-client.ts
export class WildDuckAPI {
  async createUser(
    adminAuth: WildduckUserAuth,
    userData: CreateUserRequest
  ): Promise<CreateUserResponse> {
    const response = await this.client.post(
      '/users',
      userData,
      {
        headers: {
          'Authorization': `Bearer ${adminAuth.accessToken}`
        }
      }
    );
    return response.data;
  }
}
```

**Step 4: Create Hook**
```typescript
// In src/hooks/users/useWildduckCreateUser.ts
export function useWildduckCreateUser(
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode?: boolean
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createUser = async (
    adminAuth: WildduckUserAuth,
    userData: CreateUserRequest
  ): Promise<CreateUserResponse> => {
    try {
      setLoading(true);
      setError(null);

      if (devMode) {
        return {
          success: true,
          id: '507f1f77bcf86cd799439011'
        };
      }

      const result = await networkClient.wildduckApi.createUser(
        adminAuth,
        userData
      );
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error };
}
```

**Step 5: Add Tests**
```typescript
// In src/hooks/users/__tests__/useWildduckCreateUser.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useWildduckCreateUser } from '../useWildduckCreateUser';

describe('useWildduckCreateUser', () => {
  it('should create user successfully', async () => {
    // Mock setup
    const mockNetworkClient = {
      wildduckApi: {
        createUser: vi.fn().mockResolvedValue({
          success: true,
          id: '507f1f77bcf86cd799439011'
        })
      }
    };

    const { result } = renderHook(() =>
      useWildduckCreateUser(mockNetworkClient, config)
    );

    // Test execution
    await waitFor(async () => {
      const response = await result.current.createUser(adminAuth, userData);
      expect(response.success).toBe(true);
      expect(response.id).toBeTruthy();
    });
  });

  it('should handle errors', async () => {
    // Error test
  });
});
```

**Step 6: Add Integration Test**
```typescript
// In src/__tests__/integration/users.integration.test.ts
describe('User Management Integration', () => {
  it('should create user via API', async () => {
    if (!process.env.WILDDUCK_ENDPOINT) {
      it.skip('No WildDuck endpoint configured', () => {});
      return;
    }

    const client = new WildDuckAPI(process.env.WILDDUCK_ENDPOINT);
    const result = await client.createUser(adminAuth, {
      username: 'testuser',
      password: 'TestPassword123',
      address: 'testuser@example.com'
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeTruthy();
  });
});
```

**Step 7: Document**
Add comprehensive documentation to HOOKS_DOCUMENTATION.md:

```markdown
### useWildduckCreateUser

Create a new user account.

**Hook Signature:**
[Full hook signature with types]

**Parameters:**
[Table of parameters]

**Example Usage:**
[Code examples]
```

**Step 8: Update README**
Update the API coverage table in README.md.

### Testing Strategy

#### Unit Tests
- Mock all external dependencies
- Test happy path and error cases
- Test edge cases (empty strings, null, undefined)
- Test loading states
- Verify correct hook behavior

#### Integration Tests
- Test against real WildDuck server
- Use crypto authentication (SIWE)
- Test complete workflows (create → read → update → delete)
- Verify data persistence
- Test error responses

#### Test Data
- Use deterministic test wallet: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- This is Hardhat's first test account - PUBLIC and for testing only

## API Endpoint Reference

### Authentication

**POST /authenticate**
- Supports password or crypto signature (SIWE)
- Returns: `{ success, id, username, token, require2fa, requirePasswordChange }`
- Crypto auth requires: username, signature, nonce, message, signer

### Users

**GET /users/:user**
- Get user info including limits, quota, settings
- Returns comprehensive user object

**POST /users** ⚠️ NOT IMPLEMENTED
- Create new user
- Admin operation
- HIGH PRIORITY

**PUT /users/:user** ⚠️ NOT IMPLEMENTED
- Update user settings
- Can change password, quotas, limits, etc.
- HIGH PRIORITY

### Mailboxes

**GET /users/:user/mailboxes**
- List all mailboxes
- Optional: counters (expensive), sizes (very expensive)
- ✅ IMPLEMENTED

**POST /users/:user/mailboxes**
- Create new mailbox/folder
- ✅ IMPLEMENTED

**GET /users/:user/mailboxes/:mailbox**
- Get specific mailbox details
- ✅ IMPLEMENTED

**PUT /users/:user/mailboxes/:mailbox**
- Update mailbox (rename, set retention, etc.)
- ✅ IMPLEMENTED

**DELETE /users/:user/mailboxes/:mailbox**
- Delete mailbox and all messages
- ✅ IMPLEMENTED

### Messages

**GET /users/:user/mailboxes/:mailbox/messages**
- List messages in mailbox
- Supports pagination, filtering (unseen, etc.)
- ✅ IMPLEMENTED

**GET /users/:user/messages/:message**
- Get single message by ID
- ✅ IMPLEMENTED

**PUT /users/:user/messages/:message**
- Update message (flags, move to mailbox)
- ✅ IMPLEMENTED

**DELETE /users/:user/messages/:message**
- Delete message
- ✅ IMPLEMENTED

**POST /users/:user/mailboxes/:mailbox/messages** ⚠️ NOT IMPLEMENTED
- Upload message (for drafts, imports)
- CRITICAL PRIORITY

**GET /users/:user/mailboxes/:mailbox/messages/:message/attachments/:attachment** ⚠️ NOT IMPLEMENTED
- Download attachment
- CRITICAL PRIORITY

**POST /users/:user/submit**
- Send new message
- ✅ IMPLEMENTED

**POST /users/:user/mailboxes/:mailbox/messages/:message/submit**
- Submit draft for delivery
- ✅ PARTIALLY IMPLEMENTED

### Autoreply

**GET /users/:user/autoreply** ⚠️ NOT IMPLEMENTED
- Get autoreply settings
- HIGH PRIORITY

**PUT /users/:user/autoreply** ⚠️ NOT IMPLEMENTED
- Set autoreply/vacation mode
- HIGH PRIORITY

**DELETE /users/:user/autoreply** ⚠️ NOT IMPLEMENTED
- Remove autoreply
- HIGH PRIORITY

### Addresses

**GET /users/:user/addresses**
- List user's email addresses
- ✅ IMPLEMENTED

**POST /users/:user/addresses**
- Add new email address
- ✅ IMPLEMENTED

### Storage

**POST /users/:user/storage** ⚠️ NOT IMPLEMENTED
- Upload file for later use (draft attachments)
- MEDIUM PRIORITY

**GET /users/:user/storage/:file** ⚠️ NOT IMPLEMENTED
- Download uploaded file
- MEDIUM PRIORITY

**DELETE /users/:user/storage/:file** ⚠️ NOT IMPLEMENTED
- Delete uploaded file
- MEDIUM PRIORITY

## Common Issues and Solutions

### Issue: Hook not updating after state change
**Solution**: Ensure you're using the returned `data` from the hook, not relying solely on external state.

### Issue: Integration tests failing with 401
**Solution**:
- Verify WILDDUCK_ENDPOINT is set
- Check that server is in crypto mode
- Verify signature generation is correct (SIWE format)

### Issue: Type errors with @johnqh/types
**Solution**:
- Ensure @johnqh/types is up to date
- Check if type exists before creating duplicate
- Consider contributing new types to @johnqh/types

### Issue: React Query caching unexpected behavior
**Solution**:
- Understand React Query's caching strategy
- Use proper query keys
- Consider staleTime and cacheTime settings

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types
- Explicit return types on functions
- Use `unknown` for truly unknown types
- Prefer interfaces over types for extensibility

### React
- Functional components only
- Hooks for all state management
- No class components
- Props must be typed

### Testing
- Minimum 80% code coverage
- Every hook must have unit tests
- Critical paths need integration tests
- Test error cases thoroughly

### Documentation
- JSDoc on all public APIs
- Examples for complex usage
- Keep HOOKS_DOCUMENTATION.md up to date
- Update README when adding features

## Future Roadmap

### Short Term (1-2 months)
1. Complete critical endpoints (user creation, message upload, attachments)
2. Implement autoreply management
3. Add bulk message operations
4. Improve error handling and recovery

### Medium Term (3-6 months)
1. Application-Specific Passwords (ASPs)
2. Storage API for file management
3. Webhook support
4. Advanced search capabilities
5. Archive management

### Long Term (6-12 months)
1. Admin features (DKIM, TLS, domain management)
2. Audit log access
3. Complete API coverage (100%)
4. Performance optimizations
5. React Native-specific optimizations

## Related Documentation

- **README.md**: Project overview and quick start
- **HOOKS_DOCUMENTATION.md**: Comprehensive hook documentation (1,660 lines)
- **WILDDUCK_API_ENDPOINTS.md**: Complete API reference (2,715 lines)
- **GAP_ANALYSIS.md**: Implementation status and priorities
- **INTEGRATION_TESTS.md**: Integration testing guide
- **CI_CD_SETUP.md**: CI/CD pipeline documentation
- **DEPLOYMENT.md**: Deployment procedures
- **.cursorrules**: Quick reference for AI assistants

## Questions to Ask Before Starting

1. **Is this endpoint documented in WILDDUCK_API_ENDPOINTS.md?**
   - If no, consult WildDuck API docs first

2. **What's the priority level? (Check GAP_ANALYSIS.md)**
   - Critical → Start immediately
   - High → Next sprint
   - Medium → Backlog
   - Low → Future consideration

3. **Do types exist in @johnqh/types?**
   - If yes, import and use
   - If no, create locally and consider contributing upstream

4. **Is there a similar hook I can reference?**
   - Copy the pattern, don't reinvent

5. **What's the error handling strategy?**
   - Follow existing patterns
   - Document error codes

6. **Does this need integration testing?**
   - Most endpoints should have integration tests
   - Critical paths must have them

7. **What's the React Native impact?**
   - Avoid browser-specific APIs
   - Test on both web and RN if possible

## Contact and Support

For questions about:
- **WildDuck API**: Check [WildDuck docs](https://docs.wildduck.email/api/)
- **Types Package**: See @johnqh/types README
- **0xmail Project**: Check 0xmail organization
- **This Library**: Open GitHub issue

## Version History

- **0.0.12** (Current): Type migration to @johnqh/types package
- **0.0.11**: Hook memoization fixes
- **0.0.10**: Integration tests added
- Earlier versions: Initial implementation

---

Last Updated: 2025-10-11
Maintained by: 0xmail team
