# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive CI/CD pipeline with GitHub Actions
- Main CI workflow with multi-Node.js version testing
- Automated release workflow with npm publishing
- Security scanning with CodeQL, dependency audits, and secrets detection
- Package validation and integrity checks
- Integration tests for CLI functionality
- SBOM (Software Bill of Materials) generation
- License compliance checking
- Supply chain security validation

### Changed
- Enhanced package.json with additional scripts for CI/CD
- Improved test coverage and reporting
- Added provenance support for npm publishing

### Security
- Added TruffleHog secret scanning
- Implemented dependency vulnerability checking
- Added package signature verification
- Created comprehensive security workflow

## [1.0.0] - 2025-07-02

### Added
- Initial release of doctool CLI
- AI-powered documentation validation and enhancement
- File system validator for checking broken links and references
- Knowledge management system with automatic content generation
- Git integration for change detection and incremental updates
- Interactive update system with user approval prompts
- CLI with validate, enhance, and update commands
- Support for multiple AI providers through PraisonAI
- Environment variable configuration for API keys
- Comprehensive test suite with Vitest
- pkg.pr.new integration for preview package publishing
- Node.js wrapper for reliable CLI execution

### Features
- **Documentation Validation**: Detect broken links, missing files, and invalid references
- **AI Enhancement**: Improve documentation quality with AI-generated content
- **Incremental Updates**: Smart updates based on git changes
- **Interactive CLI**: User-friendly command-line interface with help and verbose modes
- **Multi-format Support**: Works with Markdown, text files, and various documentation formats
- **Git Integration**: Automatic change detection and diff generation
- **Safe Operations**: Non-destructive operations with user confirmation
- **Extensible Architecture**: Plugin-ready design for future enhancements

### Technical Details
- TypeScript implementation with full type safety
- ES modules with modern Node.js support (>=18.0.0)
- pnpm package management
- Vitest testing framework
- tsx for TypeScript execution
- Dotenv for environment configuration
- Conventional commits for version management

### Documentation
- Comprehensive README with installation and usage instructions
- API documentation for all modules
- Knowledge files for self-documentation
- CI/CD integration guide
- Development setup instructions

### Security
- OpenAI API key validation and secure handling
- No sensitive data in package contents
- Environment variable best practices
- Safe file system operations with proper validation
