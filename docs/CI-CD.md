# CI/CD Integration

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the `doctool` project.

## Overview

The project uses GitHub Actions for CI/CD with four main workflows:

1. **Main CI Pipeline** (`.github/workflows/ci.yml`)
2. **Release Pipeline** (`.github/workflows/release.yml`)
3. **Security Scanning** (`.github/workflows/security.yml`)
4. **Package Publishing** (`.github/workflows/pkg-pr-new.yml`)

## Workflows

### 1. Main CI Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Lint and Format Check
- Runs TypeScript compiler checks (`tsc --noEmit`)
- Checks code formatting (when configured)
- Runs linting rules (when configured)

#### Test Matrix
- Tests across Node.js versions: 18, 20, 22
- Runs all unit tests with Vitest
- Generates coverage reports (Node.js 20 only)
- Uploads coverage to Codecov

#### Integration Tests
- Tests CLI installation and basic functionality
- Validates `doctool validate` command
- Tests `doctool enhance` command in dry-run mode
- Ensures CLI works after global installation

#### Package Validation
- Validates `package.json` structure
- Tests package creation with `pnpm pack`
- Checks for sensitive files in package contents
- Verifies required files are included
- Tests package installation from tarball

### 2. Release Pipeline (`release.yml`)

**Triggers:**
- Git tags matching `v*.*.*` pattern (e.g., `v1.0.0`, `v2.1.3`)

**Process:**
1. Runs full test suite and validation
2. Extracts version from git tag
3. Updates `package.json` version to match tag
4. Creates GitHub release with changelog
5. Publishes to npm with provenance
6. Uploads package tarball as release asset
7. Notifies of successful release

**Requirements:**
- `NPM_TOKEN` secret must be configured in GitHub repository settings
- Tags should follow semantic versioning (`v1.2.3`)

### 3. Security Scanning (`security.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Weekly schedule (Sundays at 2 AM UTC)

**Security Checks:**

#### Dependency Security
- Runs `pnpm audit` for known vulnerabilities
- Uses `better-npm-audit` for enhanced reporting
- Checks for outdated dependencies

#### CodeQL Analysis
- GitHub's semantic code analysis
- Scans TypeScript code for security issues
- Uses security-and-quality query suite

#### Secrets Scanning
- Uses TruffleHog to scan for accidentally committed secrets
- Scans full git history
- Only reports verified secrets to reduce false positives

#### License Compliance
- Checks all dependency licenses
- Warns about GPL-style licenses that may require review
- Generates license summary

#### Supply Chain Security
- Verifies package signatures when possible
- Checks for common typosquatting targets
- Generates Software Bill of Materials (SBOM)
- Uploads SBOM as artifact for compliance

### 4. Package Publishing (`pkg-pr-new.yml`)

**Triggers:**
- All pushes and pull requests

**Purpose:**
- Publishes preview packages using pkg.pr.new
- Allows testing changes before official release
- Useful for reviewing PRs with package changes

## CI/CD Features

### Exit Codes and Reporting

The CI system is designed to provide clear feedback:

- **Success (0)**: All checks pass
- **Failure (1)**: Tests fail, security issues found, or validation errors
- **Warning**: Some checks fail but don't block the pipeline (marked with `continue-on-error: true`)

### Caching Strategy

All workflows use aggressive caching to improve performance:

- **pnpm Store Cache**: Shared across jobs and workflows
- **Node.js Cache**: Built-in with actions/setup-node
- **asdf Cache**: Tool version management caching

### Security Best Practices

- **Provenance**: npm publishes include provenance for supply chain security
- **Minimal Permissions**: Each job has only required permissions
- **Secret Management**: Uses GitHub secrets for sensitive data
- **SBOM Generation**: Creates software bill of materials for compliance

## Setup Instructions

### 1. Repository Secrets

Configure these secrets in GitHub repository settings:

```
NPM_TOKEN=npm_xxxxxxxxxxxxx  # npm authentication token
```

To create an npm token:
1. Log in to npmjs.com
2. Go to Access Tokens in your account settings
3. Create a new "Automation" token
4. Add it as `NPM_TOKEN` in GitHub repository secrets

### 2. Branch Protection

Recommended branch protection rules for `main`:

- Require status checks to pass before merging
- Required status checks:
  - `Lint and Format Check`
  - `Test (Node.js 18)`
  - `Test (Node.js 20)`
  - `Test (Node.js 22)`
  - `Integration Tests`
  - `Package Validation`
- Require up-to-date branches before merging
- Require review from code owners

### 3. Release Process

To create a new release:

1. Update version in `package.json` (optional, will be done automatically)
2. Update `CHANGELOG.md` with release notes
3. Commit changes: `git commit -m "chore: prepare v1.2.3 release"`
4. Create and push tag: `git tag v1.2.3 && git push origin v1.2.3`
5. Release workflow will automatically:
   - Run all tests
   - Create GitHub release
   - Publish to npm
   - Upload package assets

## Monitoring and Debugging

### GitHub Actions

- View workflow runs in the "Actions" tab of the repository
- Each job shows detailed logs and timing
- Failed jobs highlight specific errors
- Artifacts (like SBOM) are available for download

### Coverage Reports

- Coverage reports are uploaded to Codecov
- Badge shows current coverage percentage
- Detailed coverage information available on Codecov dashboard

### Security Alerts

- GitHub will create security advisories for found vulnerabilities
- Dependabot will create PRs for security updates
- CodeQL results appear in the "Security" tab

### Performance Monitoring

- Workflow run times are tracked
- Cache hit rates can be monitored in job logs
- Package size and contents are validated in each run

## Future Enhancements

Potential CI/CD improvements:

1. **Enhanced Linting**: Add ESLint and Prettier
2. **Performance Testing**: Add benchmarks and performance regression tests
3. **Multi-platform Testing**: Test on Windows and macOS
4. **Docker Integration**: Containerized testing and deployment
5. **Automated Dependency Updates**: Enhanced Dependabot configuration
6. **Integration Testing**: Test against real repositories and APIs
7. **Release Notes Automation**: Auto-generate release notes from commits
8. **Notification Integration**: Slack/Discord notifications for releases

## Troubleshooting

### Common Issues

**Tests fail in CI but pass locally:**
- Check Node.js version differences
- Verify environment variables are available
- Check for timing-dependent tests

**Release workflow fails:**
- Verify `NPM_TOKEN` is valid and has publish permissions
- Ensure tag follows semantic versioning
- Check package.json has correct package name

**Security scans fail:**
- Review vulnerability reports
- Update dependencies to fix issues
- Consider using `pnpm audit --fix` for automatic fixes

**Package validation fails:**
- Check `.npmignore` or `files` field in package.json
- Verify all required files are included
- Test packaging locally with `pnpm pack`
