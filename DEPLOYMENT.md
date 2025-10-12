# Deployment Guide

Quick reference for deploying new versions of the WildDuck client library.

## Pre-Deployment Checklist

- [ ] All tests pass locally: `npm run check-all`
- [ ] Integration tests verified (if applicable): `WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration`
- [ ] Documentation updated
- [ ] CHANGELOG updated (if applicable)
- [ ] No uncommitted changes: `git status`

## Deployment Steps

### 1. Update Version

Choose the appropriate version bump based on changes:

```bash
# For bug fixes (0.0.1 → 0.0.2)
npm version patch

# For new features (0.0.1 → 0.1.0)
npm version minor

# For breaking changes (0.0.1 → 1.0.0)
npm version major
```

This automatically:
- Updates `package.json` version
- Updates `package-lock.json`
- Creates a git commit
- Creates a git tag

### 2. Push to GitHub

```bash
# Push commits and tags
git push origin main
git push origin --tags
```

### 3. Automated Process

Once pushed, GitHub Actions automatically:

1. **Runs Tests** (2-3 min)
   - Type checking
   - Linting
   - Unit tests on Node 20.x and 22.x
   - Build verification

2. **Creates Release** (1-2 min)
   - Builds production package
   - Runs coverage tests
   - Creates GitHub release
   - Generates release notes

3. **Publishes to NPM** (< 1 min)
   - Publishes package with public access
   - Updates NPM registry

**Total Time**: ~5-7 minutes

### 4. Verify Deployment

Check the deployment succeeded:

- **GitHub Actions**: https://github.com/0xmail/wildduck_client/actions
- **GitHub Releases**: https://github.com/0xmail/wildduck_client/releases
- **NPM Package**: https://www.npmjs.com/package/@sudobility/wildduck_client

## Post-Deployment

1. **Verify NPM Installation**:
   ```bash
   npm view @sudobility/wildduck_client
   ```

2. **Test Installation**:
   ```bash
   mkdir test-install && cd test-install
   npm init -y
   npm install @sudobility/wildduck_client
   ```

3. **Announce Release**:
   - Update project README
   - Notify team/users
   - Post on relevant channels

## Rollback

If you need to rollback a release:

### Option 1: Deprecate on NPM

```bash
npm deprecate @sudobility/wildduck_client@0.0.2 "This version has critical bugs, use 0.0.1 instead"
```

### Option 2: Publish Fixed Version

```bash
npm version patch  # Creates 0.0.3
git push origin main --tags
```

### Option 3: Unpublish (within 72 hours)

```bash
npm unpublish @sudobility/wildduck_client@0.0.2
```

**Note**: Unpublishing is only possible within 72 hours of publishing and is generally discouraged.

## Skip Deployment

To skip deployment for non-code changes:

```bash
git commit -m "Update documentation [skip ci]"
git push origin main
```

This will:
- ✅ Run tests
- ⏭️ Skip release creation
- ⏭️ Skip NPM publishing

## Emergency Procedures

### Build Fails in CI/CD

1. Check the workflow logs: https://github.com/0xmail/wildduck_client/actions
2. Identify the failing step
3. Fix the issue locally
4. Test locally: `npm run check-all`
5. Push fix: `git push origin main`

### NPM Publish Fails

1. **Check NPM Token**:
   - Verify `NPM_TOKEN` secret is configured
   - Regenerate if expired

2. **Check Permissions**:
   - Ensure you have publish rights to `@sudobility` scope
   - Verify token type is "Automation"

3. **Check Version**:
   - Version must be higher than published versions
   - Check: `npm view @sudobility/wildduck_client versions`

### Manual Publish (Emergency Only)

If CI/CD fails and you need to publish immediately:

```bash
# Ensure you're on the correct commit
git checkout main
git pull

# Clean install
npm ci

# Run all checks
npm run check-all

# Build
npm run build

# Verify build
ls -la dist/

# Login to NPM (if not already)
npm login

# Publish
npm publish --access restricted

# Create GitHub release manually
# Go to: https://github.com/0xmail/wildduck_client/releases/new
```

## Version History

Track all published versions:

```bash
npm view @sudobility/wildduck_client versions
```

## Monitoring

### GitHub Actions Status Badge

Add to README.md:

```markdown
[![CI/CD](https://github.com/0xmail/wildduck_client/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/0xmail/wildduck_client/actions/workflows/ci-cd.yml)
```

### NPM Version Badge

```markdown
[![npm version](https://badge.fury.io/js/@sudobility%2Fwildduck_client.svg)](https://www.npmjs.com/package/@sudobility/wildduck_client)
```

### NPM Downloads Badge

```markdown
[![npm downloads](https://img.shields.io/npm/dm/@sudobility/wildduck_client.svg)](https://www.npmjs.com/package/@sudobility/wildduck_client)
```

## Security

- **Never commit** NPM tokens
- Use automation tokens, not personal tokens
- Rotate tokens regularly
- Use 2FA on NPM account
- Review package access regularly

## Support

For deployment issues:
1. Check workflow logs
2. Review this guide
3. Check CI/CD documentation: `.github/workflows/README.md`
4. Open an issue if needed

---

**Package Name**: `@sudobility/wildduck_client`
**Registry**: https://registry.npmjs.org
**Repository**: https://github.com/0xmail/wildduck_client
