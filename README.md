# DocTool

[![pkg.pr.new](https://pkg.pr.new/badge/PinePeakDigital/doctool)](https://pkg.pr.new/~/PinePeakDigital/doctool)

> **AI-powered documentation validation and management system**

DocTool is a comprehensive documentation management tool that combines reliable TypeScript code for system operations with AI-powered content generation and validation. It helps maintain accurate, up-to-date documentation across your entire codebase.

## ✨ Features

### 🔍 **Stack-Agnostic Validation**
- **File System Validation**: Verify file references, directory structures, and path accuracy
- **Link Validation**: Check HTTP/HTTPS URLs, internal links, anchors, and email addresses
- **Command Validation**: Validate shell commands and configuration examples
- **Content Quality**: Detect broken formatting, placeholder text, and inconsistencies

### 🤖 **AI-Powered Enhancement**
- **Smart Content Generation**: Analyze code to generate accurate documentation
- **Issue-Driven Updates**: Identify specific problems and apply targeted fixes
- **Template Population**: Replace placeholder content with meaningful descriptions
- **Knowledge File Management**: Systematically create and maintain project documentation

### 🛠️ **Developer-Friendly Workflow**
- **Git Integration**: Detect changes and provide review workflows
- **Interactive Mode**: Control what gets updated with approval prompts
- **Dry Run Support**: Preview changes before applying them
- **Granular Control**: Use `git add -p` for surgical change staging

## 🚀 Quick Start

### Installation

#### Option 1: From Package (Recommended)
```bash
# Install globally from npm
npm install -g doctool

# Or install locally in your project
npm install --save-dev doctool
```

#### Option 2: From Source
```bash
# Clone the repository
git clone https://github.com/your-username/doctool.git
cd doctool

# Install dependencies
pnpm install

# Make it globally available (optional)
npm link
```

### Basic Usage

```bash
# Validate all documentation
doctool validate

# Initialize knowledge files for your project
doctool init

# Enhance knowledge files with AI-generated content
doctool enhance

# Update documentation based on code changes
doctool update
```

## 📖 Commands

### `validate [path]`
Validates documentation files for broken links, missing references, and content issues.

```bash
# Validate current directory
doctool validate

# Validate specific path
doctool validate /path/to/docs
```

**What it checks:**
- File references and paths
- HTTP/HTTPS link availability
- Internal link targets
- Anchor link destinations
- Email address formats
- Directory structure accuracy

### `init [path]`
Initializes knowledge files across your project directories.

```bash
# Initialize in current directory
doctool init

# Initialize in specific project
doctool init /path/to/project
```

**What it creates:**
- `knowledge.md` files in each significant directory
- Standardized documentation templates
- Proper section structure and formatting

### `enhance [path]`
Enhances knowledge files with AI-generated content.

```bash
# Enhance knowledge files with AI content
doctool enhance

# Enhance specific project
doctool enhance /path/to/project
```

**What it does:**
- Analyzes code files to generate accurate descriptions
- Replaces template placeholders with meaningful content
- Adds file listings and dependency information
- Creates comprehensive documentation from code analysis

### `update [path]`
Updates documentation using issue-driven targeted fixes.

```bash
# Auto-update with targeted fixes
doctool update

# Interactive mode (prompt before each update)
doctool update --interactive

# Preview changes without applying
doctool update --dry-run

# Include low-severity fixes
doctool update --severity-threshold low
```

**What it fixes:**
- Missing file documentation
- Outdated file descriptions
- Placeholder content
- References to deleted files
- Missing standard sections

### `agents`
Starts AI agents for advanced documentation processing (requires PraisonAI setup).

## 🧪 Testing Unreleased Versions

You can test any commit or pull request using [pkg.pr.new](https://pkg.pr.new):

```bash
# Test the latest main branch
npx https://pkg.pr.new/doctool@main --help

# Test a specific pull request
npx https://pkg.pr.new/doctool@pr-123 validate

# Install a specific commit globally
npm install -g https://pkg.pr.new/doctool@sha-abc1234
```

> 📖 **See [docs/pkg-pr-new.md](docs/pkg-pr-new.md) for complete documentation**

## 🔧 Configuration

DocTool works out of the box with sensible defaults, but you can customize its behavior:

### API Key Setup (Required for AI Features)

To use AI-powered features (`enhance` and `update` commands), you need an OpenAI API key:

#### Option 1: Environment Variable
```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

#### Option 2: .env File (Recommended)
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
OPENAI_API_KEY=sk-your-api-key-here
```

#### Getting Your API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Create a new API key
4. Copy the key (starts with `sk-`)

> ⚠️ **Important**: Keep your API key secure and never commit it to version control!

### Other Environment Variables

```bash
# Optional: Custom validation rules
export DOCTOOL_SEVERITY_THRESHOLD="medium"
```

### Ignored Directories

DocTool automatically skips these directories:
- `node_modules/`
- `.git/`
- `dist/` and `build/`
- `coverage/`
- Hidden directories (starting with `.`)

## 🏗️ Architecture

### Core Principles

**🔹 Hybrid Approach**: Regular TypeScript for reliable system operations + AI for creative content generation

**🔹 Issue-Driven Updates**: Identify specific problems and apply targeted fixes instead of rewriting everything

**🔹 Git-First Workflow**: Leverage git for change detection and user review processes

**🔹 Stack Agnostic**: Works with any programming language or project structure

### Key Components

```
doctool/
├── src/
│   ├── agents/           # AI agent definitions
│   ├── utils/            # Core utilities
│   │   ├── fileSystemValidator.ts    # File/path validation
│   │   ├── linkValidator.ts          # URL/link validation
│   │   ├── documentationIssues.ts    # Issue detection
│   │   ├── documentationFixer.ts     # Targeted fixes
│   │   ├── aiContentGenerator.ts     # AI content generation
│   │   └── gitUtils.ts               # Git integration
│   └── index.ts          # CLI entry point
└── README.md             # This file
```

## 🧪 Testing

DocTool has comprehensive test coverage with 99+ tests:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

**Test Categories:**
- File system validation (22 tests)
- Link validation (28 tests)
- AI content generation (16 tests)
- Git utilities (10 tests)
- Diff utilities (11 tests)
- Issue detection and fixing (12+ tests)

## 📊 Example Output

### Validation Results
```
🔍 DocTool Documentation Validator
=====================================

Found 12 documentation files to validate:

📝 Validating: README.md
   ✅ No issues found

📝 Validating: src/utils/knowledge.md
   ⚠️  Found 2 issue(s):
   1. 🚨 Internal link target not found: missing-file.md
   2. ⚠️  Generic description could be improved: helpers.ts

📊 Validation Summary
=====================
Files validated: 12
Total issues: 3
Critical issues: 1
Warnings: 2
```

### Update Results
```
🔄 Analyzing documentation issues in: /project

🔍 Analyzing: src/utils/knowledge.md
   📊 Health: ⚠️  needs_attention
   🟡 Medium: 2 issues
   🟢 Low: 1 issues
   ➕ New files: newUtility.ts, anotherHelper.ts
   ✅ Applied 3 fixes

📊 Documentation Fix Report
========================================
Files processed: 4
Total issues found: 8
Fixes applied: 6
Fixes skipped: 2

💡 Tip: Review changes with:
   git diff                    # See all changes
   git add -p                  # Interactively stage changes
   git commit -m "docs: fix documentation issues"
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run the test suite (`pnpm test`)
5. Commit using conventional commits (`git commit -m 'feat: add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

```bash
# Clone and setup
git clone https://github.com/your-username/doctool.git
cd doctool
pnpm install

# Run tests
pnpm test

# Test the CLI locally
pnpm exec tsx src/index.ts --help
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [TypeScript](https://www.typescriptlang.org/) and [Vitest](https://vitest.dev/)
- AI integration powered by [PraisonAI](https://praisonai.com/)
- Command-line interface inspired by modern developer tools

---

**Made with ❤️ for developers who care about documentation quality**
