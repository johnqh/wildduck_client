# CI/CD Workflow

This directory contains GitHub Actions workflows for automated testing and deployment.

## Workflow: CI/CD - Test and Release

**File**: `ci-cd.yml`

### Triggers

The workflow runs on:
- Push to `main` branch
- Pull requests to `main` branch (when closed/merged)

### Jobs

#### 1. Test Job

Runs on every push and PR, testing against multiple Node.js versions:

- **Node Versions**: 20.x, 22.x
- **Steps**:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies (`npm ci`)
  4. Run type checking (`npm run typecheck`)
  5. Run linting (`npm run lint`)
  6. Run unit tests (`npm run test:run`)
  7. Build project (`npm run build`)

**Note**: Integration tests are NOT run in CI/CD as they require a live WildDuck server.

#### 2. Check for Release Job

Determines if a release should be created:

- Skips if commit message contains `[skip ci]` or `[skip-ci]`
- Skips for unmerged PRs
- Extracts version from `package.json`
- Sets outputs for downstream jobs

#### 3. Release NPM Job

Only runs if:
- Tests pass
- Release check indicates a release should happen
- On `main` branch

**Steps**:
1. Checkout code
2. Setup Node.js with NPM registry
3. Install dependencies
4. Run tests with coverage
5. Build project
6. Verify build output
7. Create GitHub Release with auto-generated notes
8. Publish to NPM with public access
9. Notify success/failure

### Required Secrets

Configure these in your GitHub repository settings:

- **`NPM_TOKEN`**: Your NPM authentication token
  - Create at: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
  - Type: Automation token
  - Scope: Read and Write

### GitHub Release

Each release automatically creates:
- Git tag (e.g., `v0.0.1`)
- GitHub Release with comprehensive notes
- Auto-generated changelog from commits

### NPM Publishing

Published to: https://www.npmjs.com/package/@johnqh/wildduck_client

Package is published with:
- Public access (`--access public`)
- All files specified in `package.json` `files` field
- Built artifacts from `dist/` directory

## Version Management

To create a new release:

1. Update version in `package.json`:
   ```bash
   npm version patch  # 0.0.1 -> 0.0.2
   npm version minor  # 0.0.1 -> 0.1.0
   npm version major  # 0.0.1 -> 1.0.0
   ```

2. Commit and push to main:
   ```bash
   git add package.json package-lock.json
   git commit -m "Bump version to x.x.x"
   git push origin main
   ```

3. CI/CD will automatically:
   - Run all tests
   - Build the project
   - Create GitHub release
   - Publish to NPM

## Skipping CI/CD

To skip CI/CD for a commit, include `[skip ci]` or `[skip-ci]` in the commit message:

```bash
git commit -m "Update documentation [skip ci]"
```

## Local Testing

Before pushing, verify your changes locally:

```bash
# Install dependencies
npm ci

# Run all checks that CI/CD runs
npm run typecheck
npm run lint
npm run test:run
npm run build

# Optional: Run integration tests locally
WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration
```

## Troubleshooting

### Build Fails

Check:
- TypeScript compilation errors (`npm run typecheck`)
- Linting errors (`npm run lint`)
- Test failures (`npm run test:run`)

### NPM Publish Fails

Check:
- `NPM_TOKEN` secret is set correctly
- Token has write permissions
- Package name is not already taken
- Version number is incremented

### GitHub Release Fails

Check:
- Workflow has `contents: write` permission
- Version tag doesn't already exist
- Repository settings allow workflow to create releases

## Monitoring

View workflow runs at:
https://github.com/YOUR_ORG/YOUR_REPO/actions

Each run shows:
- Job status and timing
- Detailed logs for each step
- Artifact uploads (if any)
- Deployment notifications
