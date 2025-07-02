import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileSystemValidator, FileReference } from './fileSystemValidator';

describe('FileSystemValidator', () => {
  let tempDir: string;
  let validator: FileSystemValidator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-validator-test-'));
    validator = new FileSystemValidator(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractFileReferences', () => {
    it('should extract markdown link references', () => {
      const content = `
# Test Doc

See [config file](config/app.json) for settings.
Check out [the docs](docs/api.md) too.
Visit [external link](https://example.com) - should be ignored.
      `.trim();

      const references = validator.extractFileReferences(content, 'test.md');

      expect(references).toHaveLength(2);
      expect(references[0].path).toBe('config/app.json');
      expect(references[0].type).toBe('file');
      expect(references[1].path).toBe('docs/api.md');
      expect(references[1].type).toBe('file');
    });

    it('should extract code block file references', () => {
      const content = `
Run \`npm install\` first.
Edit the \`package.json\` file.
Then run \`src/build.sh\` script.
      `.trim();

      const references = validator.extractFileReferences(content, 'test.md');

      expect(references.some(ref => ref.path === 'package.json')).toBe(true);
      expect(references.some(ref => ref.path === 'src/build.sh')).toBe(true);
    });

    it('should extract directory references', () => {
      const content = `
The src/utils/ directory contains utilities.
Check the config/ folder for settings.
      `.trim();

      const references = validator.extractFileReferences(content, 'test.md');

      expect(references.some(ref => ref.path === 'src/utils/' && ref.type === 'directory')).toBe(true);
      expect(references.some(ref => ref.path === 'config/' && ref.type === 'directory')).toBe(true);
    });

    it('should extract common file patterns', () => {
      const content = `
First, update your package.json file.
Make sure .env is configured.
Check the README.md for more info.
      `.trim();

      const references = validator.extractFileReferences(content, 'test.md');

      expect(references.some(ref => ref.path === 'package.json')).toBe(true);
      expect(references.some(ref => ref.path === '.env')).toBe(true);
      expect(references.some(ref => ref.path === 'README.md')).toBe(true);
    });

    it('should deduplicate references from same line', () => {
      const content = `
Edit \`config.json\` and then check \`config.json\` again.
      `.trim();

      const references = validator.extractFileReferences(content, 'test.md');

      const configRefs = references.filter(ref => ref.path === 'config.json');
      expect(configRefs).toHaveLength(1);
    });

    it('should ignore URLs and mailto links', () => {
      const content = `
Visit [our site](https://example.com).
Email [us](mailto:test@example.com).
Check [local file](config.json).
      `.trim();

      const references = validator.extractFileReferences(content, 'test.md');

      expect(references).toHaveLength(1);
      expect(references[0].path).toBe('config.json');
    });
  });

  describe('extractDirectoryStructureClaims', () => {
    it('should extract directory tree structures', () => {
      const content = `
# Project Structure

\`\`\`
project/
├── src/
│   ├── index.ts
│   └── utils/
│       └── helper.ts
├── tests/
│   └── test.spec.ts
└── package.json
\`\`\`
      `.trim();

      const claims = validator.extractDirectoryStructureClaims(content, 'test.md');

      expect(claims).toHaveLength(1);
      expect(claims[0].claimed_structure.length).toBeGreaterThan(0);
      expect(claims[0].directory_path).toBe('.');
    });

    it('should handle multiple directory trees', () => {
      const content = `
# Structure 1
\`\`\`
├── file1.txt
└── file2.txt
\`\`\`

# Structure 2
\`\`\`tree
├── other.txt
\`\`\`
      `.trim();

      const claims = validator.extractDirectoryStructureClaims(content, 'test.md');

      expect(claims).toHaveLength(2);
    });
  });

  describe('validateFileReference', () => {
    beforeEach(() => {
      // Create test files and directories
      fs.writeFileSync(path.join(tempDir, 'existing-file.txt'), 'content');
      fs.mkdirSync(path.join(tempDir, 'existing-dir'));
      fs.writeFileSync(path.join(tempDir, 'existing-dir', 'nested-file.txt'), 'content');
    });

    it('should validate existing file references', () => {
      const fileRef: FileReference = {
        path: 'existing-file.txt',
        type: 'file',
        mentioned_in: {
          file: 'test.md',
          line: 1,
          context: 'test context'
        },
        exists: false
      };

      const docPath = path.join(tempDir, 'test.md');
      const issues = validator.validateFileReference(fileRef, docPath);

      expect(issues).toHaveLength(0);
      expect(fileRef.exists).toBe(true);
    });

    it('should detect missing files', () => {
      const fileRef: FileReference = {
        path: 'missing-file.txt',
        type: 'file',
        mentioned_in: {
          file: 'test.md',
          line: 1,
          context: 'test context'
        },
        exists: false
      };

      const docPath = path.join(tempDir, 'test.md');
      const issues = validator.validateFileReference(fileRef, docPath);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('missing_file');
      expect(issues[0].severity).toBe('error');
      expect(fileRef.exists).toBe(false);
    });

    it('should detect type mismatches', () => {
      const fileRef: FileReference = {
        path: 'existing-dir',
        type: 'file', // Wrong type - it's actually a directory
        mentioned_in: {
          file: 'test.md',
          line: 1,
          context: 'test context'
        },
        exists: false
      };

      const docPath = path.join(tempDir, 'test.md');
      const issues = validator.validateFileReference(fileRef, docPath);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('directory_mismatch');
      expect(issues[0].severity).toBe('warning');
    });

    it('should validate nested file paths', () => {
      const fileRef: FileReference = {
        path: 'existing-dir/nested-file.txt',
        type: 'file',
        mentioned_in: {
          file: 'test.md',
          line: 1,
          context: 'test context'
        },
        exists: false
      };

      const docPath = path.join(tempDir, 'test.md');
      const issues = validator.validateFileReference(fileRef, docPath);

      expect(issues).toHaveLength(0);
      expect(fileRef.exists).toBe(true);
    });

    it('should suggest similar files when file is missing', () => {
      // Create a similar file
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');

      const fileRef: FileReference = {
        path: 'config.js', // Missing, but config.json exists
        type: 'file',
        mentioned_in: {
          file: 'test.md',
          line: 1,
          context: 'test context'
        },
        exists: false
      };

      const docPath = path.join(tempDir, 'test.md');
      const issues = validator.validateFileReference(fileRef, docPath);

      expect(issues).toHaveLength(1);
      expect(issues[0].suggestion).toContain('config.json');
    });
  });

  describe('validateDirectoryStructure', () => {
    beforeEach(() => {
      // Create test structure
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'index.ts'), 'export {};');
      fs.writeFileSync(path.join(tempDir, 'src', 'helper.ts'), 'export {};');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
    });

    it('should validate correct directory structure', () => {
      const claim = {
        claimed_structure: [
          '├── src/',
          '│   ├── index.ts',
          '│   └── helper.ts',
          '└── package.json'
        ],
        actual_structure: [],
        location: {
          file: 'test.md',
          line: 1,
          context: 'directory tree'
        },
        directory_path: '.'
      };

      const issues = validator.validateDirectoryStructure(claim);

      // All claimed files exist, so no missing file issues
      const missingFileIssues = issues.filter(i => i.type === 'missing_file');
      expect(missingFileIssues).toHaveLength(0);
    });

    it('should detect missing files in directory structure', () => {
      const claim = {
        claimed_structure: [
          '├── src/',
          '│   ├── index.ts',
          '│   ├── helper.ts',
          '│   └── missing.ts', // This file doesn't exist
          '└── package.json'
        ],
        actual_structure: [],
        location: {
          file: 'test.md',
          line: 1,
          context: 'directory tree'
        },
        directory_path: '.'
      };

      const issues = validator.validateDirectoryStructure(claim);

      // Should find at least one missing file issue for missing.ts
      const missingFileIssues = issues.filter(i => i.type === 'missing_file' && i.message.includes('missing.ts'));
      expect(missingFileIssues.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateDocumentationFile', () => {
    it('should validate a complete documentation file', () => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'index.ts'), 'export {};');

      // Create documentation file
      const docContent = `
# Test Project

## Configuration

Edit the \`config.json\` file for settings.

## Structure

The src/ directory contains the source code.
See [index file](src/index.ts) for the main entry point.

## Missing References

This references a [missing file](nonexistent.txt).
      `.trim();

      const docPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(docPath, docContent);

      const issues = validator.validateDocumentationFile(docPath);

      // Should find the missing file but not flag existing ones
      const missingFileIssues = issues.filter(issue => issue.type === 'missing_file');
      expect(missingFileIssues).toHaveLength(1);
      expect(missingFileIssues[0].file_reference.path).toBe('nonexistent.txt');

      // No issues for existing files
      const existingFileIssues = issues.filter(issue => 
        issue.file_reference.path === 'config.json' || 
        issue.file_reference.path === 'src/index.ts'
      );
      expect(existingFileIssues).toHaveLength(0);
    });

    it('should handle file reading errors gracefully', () => {
      const nonExistentDoc = path.join(tempDir, 'missing-doc.md');
      const issues = validator.validateDocumentationFile(nonExistentDoc);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('invalid_path');
      expect(issues[0].severity).toBe('error');
    });
  });

  describe('path type detection', () => {
    it('should correctly guess file vs directory types', () => {
      const testCases = [
        { path: 'file.txt', expected: 'file' },
        { path: 'directory/', expected: 'directory' },
        { path: 'path/to/file.js', expected: 'file' },
        { path: 'path/to/dir/', expected: 'directory' },
        { path: '.env', expected: 'file' },
        { path: '.hidden', expected: 'file' }
      ];

      testCases.forEach(({ path, expected }) => {
        const ref = validator.extractFileReferences(`\`${path}\``, 'test.md')[0];
        expect(ref?.type).toBe(expected);
      });

      // Test that 'no-extension' files are not detected as file references
      // since they're ambiguous and could be commands or other text
      const noExtensionRefs = validator.extractFileReferences('`no-extension`', 'test.md');
      expect(noExtensionRefs).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty documentation files', () => {
      const docPath = path.join(tempDir, 'empty.md');
      fs.writeFileSync(docPath, '');

      const issues = validator.validateDocumentationFile(docPath);
      expect(issues).toHaveLength(0);
    });

    it('should handle documentation with no file references', () => {
      const docContent = `
# Pure Text Document

This document contains no file references.
Just some regular text and explanations.
      `.trim();

      const docPath = path.join(tempDir, 'no-refs.md');
      fs.writeFileSync(docPath, docContent);

      const issues = validator.validateDocumentationFile(docPath);
      expect(issues).toHaveLength(0);
    });

    it('should handle very long file paths', () => {
      const longPath = 'very/long/path/that/goes/deep/into/nested/directories/file.txt';
      const content = `Check [\`${longPath}\`](${longPath})`;

      const references = validator.extractFileReferences(content, 'test.md');
      expect(references).toHaveLength(1);
      expect(references[0].path).toBe(longPath);
    });

    it('should handle special characters in file names', () => {
      const specialFile = 'file-with_special.chars@2024.txt';
      fs.writeFileSync(path.join(tempDir, specialFile), 'content');

      const content = `See [\`${specialFile}\`](${specialFile})`;
      const docPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(docPath, content);

      const issues = validator.validateDocumentationFile(docPath);
      expect(issues).toHaveLength(0);
    });
  });
});
