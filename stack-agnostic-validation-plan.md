# Stack-Agnostic Documentation Validation Plan

## Core Insight

We cannot assume any specific programming language, build tools, or compilation environment. Our validation system must work across:

- Any programming language (Python, JavaScript, TypeScript, Rust, Go, Java, etc.)
- Any project structure
- Any documentation format
- Projects without build tools or compilation steps

## Universal Validation Approaches

### 1. File System-Based Validation

#### File Existence Validation

```typescript
interface FileReference {
  path: string;
  type: "file" | "directory";
  mentioned_in: DocumentationLocation;
  exists: boolean;
}

class FileSystemValidator {
  validateFileReferences(docPath: string): FileReference[];
  checkDirectoryStructure(
    claimedStructure: string[],
    actualStructure: string[],
  ): ValidationIssue[];
  validateRelativePaths(
    basePath: string,
    documentedPaths: string[],
  ): ValidationIssue[];
}
```

**What we can validate:**

- Files mentioned in documentation actually exist
- Directory structures match documentation claims
- Relative paths are correct
- File counts and listings are accurate

#### Example Validation Rules:

- "The `src/utils/` directory contains..." → Check if directory exists and list contents
- "See `config.json` for settings" → Verify file exists
- "Run `npm install`" → Check if `package.json` exists

### 2. Text Pattern-Based Validation

#### Command Validation

```typescript
interface CommandReference {
  command: string;
  context: string;
  location: DocumentationLocation;
  executable_exists: boolean;
  syntax_valid: boolean;
}

class CommandValidator {
  extractCommands(docContent: string): CommandReference[];
  validateCommandExists(command: string): boolean;
  validateSyntax(command: string, shell: string): boolean;
}
```

**What we can validate:**

- Shell commands have valid syntax
- Referenced executables exist in PATH
- Command flags and options are valid (for common tools)
- File paths in commands exist

#### Example Validation Rules:

- `npm install` → Check if `npm` exists in PATH
- `python script.py` → Verify `python` exists and `script.py` exists
- `./build.sh` → Check if script exists and is executable

### 3. Documentation Structure Validation

#### Content Consistency

```typescript
interface DocumentationSection {
  title: string;
  content: string;
  level: number;
  location: DocumentationLocation;
}

class StructureValidator {
  validateHeadingStructure(sections: DocumentationSection[]): ValidationIssue[];
  checkRequiredSections(
    sections: DocumentationSection[],
    template: string[],
  ): ValidationIssue[];
  validateInternalLinks(docPath: string): ValidationIssue[];
}
```

**What we can validate:**

- Consistent heading structure
- Required sections are present
- Internal links work
- Table of contents matches actual structure
- Cross-references between files are valid

### 4. External Reference Validation

#### URL and Link Validation

```typescript
interface ExternalReference {
  url: string;
  type: "http" | "https" | "file" | "mailto";
  status: "valid" | "broken" | "unreachable";
  response_code?: number;
}

class LinkValidator {
  validateUrls(docContent: string): ExternalReference[];
  checkHttpLinks(urls: string[]): Promise<ExternalReference[]>;
  validateEmailAddresses(emails: string[]): ValidationIssue[];
}
```

### 5. Configuration File Validation

#### Common Config Patterns

```typescript
interface ConfigReference {
  file: string;
  format: "json" | "yaml" | "toml" | "ini" | "env";
  claims: ConfigClaim[];
  actual_content?: any;
}

class ConfigValidator {
  validateConfigFiles(docPath: string): ConfigReference[];
  checkJsonSyntax(filePath: string): ValidationIssue[];
  validateYamlSyntax(filePath: string): ValidationIssue[];
  compareDocumentedVsActual(
    claims: ConfigClaim[],
    actual: any,
  ): ValidationIssue[];
}
```

**What we can validate:**

- Configuration files have valid syntax
- Documented config options actually exist
- Example configurations are syntactically correct
- Environment variable references are consistent

### 6. Language-Agnostic Code Validation

#### Basic Syntax Checking

```typescript
interface CodeBlock {
  language: string;
  content: string;
  location: DocumentationLocation;
  syntax_valid: boolean;
}

class CodeBlockValidator {
  extractCodeBlocks(docContent: string): CodeBlock[];
  validateSyntax(code: string, language: string): boolean;
  checkIndentation(code: string): ValidationIssue[];
}
```

**What we can validate:**

- Code blocks have specified language
- Basic syntax validity (where possible)
- Consistent indentation
- Matching brackets/parentheses
- Valid JSON/YAML/XML in code examples

## Implementation Strategy

### Phase 1: File System Validation (Week 1)

```typescript
// Start with the most reliable validation
class FileSystemValidator {
  validateFileReferences(docPath: string): ValidationIssue[] {
    // Extract file paths from markdown
    // Check each path exists
    // Report missing files
  }

  validateDirectoryStructure(docPath: string): ValidationIssue[] {
    // Parse documented directory trees
    // Compare with actual file system
    // Report discrepancies
  }
}
```

### Phase 2: Link and URL Validation (Week 2)

```typescript
class LinkValidator {
  validateInternalLinks(docPath: string): ValidationIssue[];
  validateExternalUrls(docPath: string): Promise<ValidationIssue[]>;
  validateRelativeReferences(
    basePath: string,
    docPath: string,
  ): ValidationIssue[];
}
```

### Phase 3: Command and Configuration Validation (Week 3)

```typescript
class CommandValidator {
  validateShellCommands(docContent: string): ValidationIssue[];
  checkExecutableExists(command: string): boolean;
  validateCommandSyntax(command: string): boolean;
}
```

### Phase 4: Content Structure Validation (Week 4)

```typescript
class ContentValidator {
  validateHeadingStructure(docPath: string): ValidationIssue[];
  checkRequiredSections(
    docPath: string,
    template: SectionTemplate,
  ): ValidationIssue[];
  validateTableOfContents(docPath: string): ValidationIssue[];
}
```

## Universal Validation Rules

### Critical (Must Fix)

1. **File References**: All referenced files/directories exist
2. **Broken Links**: Internal and external links work
3. **Invalid Commands**: Commands have correct syntax
4. **Malformed Config**: Configuration files are syntactically valid

### Warning (Should Fix)

1. **Missing Files**: Code examples reference non-existent files
2. **Outdated Paths**: File paths that have moved
3. **Inconsistent Structure**: Heading levels skip or are inconsistent
4. **Dead URLs**: External links return 404

### Info (Nice to Fix)

1. **Style Inconsistencies**: Heading capitalization, formatting
2. **Missing Sections**: Optional but recommended sections
3. **Unclear Examples**: Code blocks without language specification

## Technology Stack (Universal)

### Core Dependencies

- **File System Operations**: Node.js `fs` module (works everywhere)
- **HTTP Requests**: For URL validation (universal)
- **Regular Expressions**: For pattern matching (universal)
- **Markdown Parsing**: Lightweight parser (language-agnostic)

### No Dependencies On

- ❌ Compilation tools
- ❌ Language-specific parsers
- ❌ Build systems
- ❌ Package managers
- ❌ IDEs or editors

## Example Validation Scenarios

### Scenario 1: Python Project

```markdown
# My Python Project

## Installation

Run `pip install -r requirements.txt`

## Usage

Execute `python main.py --config config.json`
```

**Validations:**

- ✅ Check if `requirements.txt` exists
- ✅ Check if `main.py` exists
- ✅ Check if `config.json` exists
- ✅ Verify `pip` and `python` are available
- ✅ Validate `config.json` syntax

### Scenario 2: Any Web Project

```markdown
# Web App

See the API documentation at [docs/api.md](docs/api.md)
Visit our website: https://example.com
```

**Validations:**

- ✅ Check if `docs/api.md` exists
- ✅ Validate `https://example.com` responds
- ✅ Check relative path is correct

## Success Metrics

### Accuracy Goals

- **95%+ File Reference Accuracy**: Correctly identify missing files
- **99%+ Link Validation**: Accurately detect broken links
- **90%+ Command Validation**: Flag invalid commands
- **Zero False File Deletions**: Never suggest removing valid files

### Coverage Goals

- **100% File References**: Check all mentioned files
- **100% URLs**: Validate all external links
- **95% Commands**: Validate common shell commands
- **90% Config Files**: Check standard configuration formats

## Next Steps

1. **Immediate**: Build file system validator
2. **Week 1**: Test against existing DocTool knowledge files
3. **Week 2**: Add link validation capabilities
4. **Week 3**: Expand to command and config validation
5. **Week 4**: Integrate all validators into unified system

---

_This approach works with any programming language and doesn't require project-specific tooling._
