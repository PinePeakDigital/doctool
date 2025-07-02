# pkg.pr.new Integration

This project uses [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new) for continuous releases, making it easy to test the CLI tool from any commit or pull request.

## What is pkg.pr.new?

pkg.pr.new creates ephemeral npm package releases for every commit and pull request, allowing you to install and test the exact version of the code from any GitHub branch or PR.

## How to Use

### Install from main branch
```bash
npm install https://pkg.pr.new/doctool@main
# or
pnpm install https://pkg.pr.new/doctool@main
```

### Install from a specific commit
```bash
npm install https://pkg.pr.new/doctool@sha-abc1234
```

### Install from a pull request
```bash
npm install https://pkg.pr.new/doctool@pr-123
```

### Test the CLI after installation
```bash
# If installed globally
doctool --help

# If installed locally
npx doctool --help

# Or run directly without installing
npx https://pkg.pr.new/doctool@main --help
```

## GitHub Actions Workflow

The `.github/workflows/pkg-pr-new.yml` workflow automatically:

1. **Runs on every push and pull request**
2. **Sets up Node.js and pnpm**
3. **Installs dependencies with caching**
4. **Runs the full test suite**
5. **Publishes to pkg.pr.new** if tests pass

## Workflow Steps

```yaml
- Setup Node.js 18
- Setup pnpm with caching
- Install dependencies
- Run tests (pnpm test)
- Publish to pkg.pr.new
```

## Benefits

- **Easy PR testing**: Reviewers can install and test PRs instantly
- **No version conflicts**: Each commit gets its own unique package
- **Automatic cleanup**: Packages are automatically removed after a period
- **Zero configuration**: Works with existing npm scripts and package.json

## Example Usage in Reviews

When reviewing a PR #123, you can test it with:

```bash
# Install the PR version
pnpm install -g https://pkg.pr.new/doctool@pr-123

# Test the new features
doctool validate --verbose
doctool update --dry-run

# Clean up when done
npm uninstall -g doctool
```

## Package Metadata

The package.json includes:

- ✅ Proper `bin` field for CLI installation
- ✅ `files` field to include only necessary files
- ✅ Engine requirements (Node.js >=18)
- ✅ Keywords for discoverability
- ✅ Repository and homepage links

## Troubleshooting

### Package not found
- Check that the workflow completed successfully
- Verify the commit SHA or PR number is correct
- Wait a few minutes for the package to become available

### Installation fails
- Ensure you have Node.js 18+ installed
- Try clearing npm/pnpm cache
- Check network connectivity

### CLI not working after install
- Verify the package was installed correctly: `npm list -g doctool`
- Try running with npx: `npx doctool --help`
- Check that the bin script is executable

## Links

- [pkg.pr.new GitHub Repository](https://github.com/stackblitz-labs/pkg.pr.new)
- [GitHub Actions Workflow](../.github/workflows/pkg-pr-new.yml)
- [Package.json Configuration](../package.json)
