import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LinkValidator, LinkReference } from './linkValidator';

// Mock fetch for HTTP testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LinkValidator', () => {
  let tempDir: string;
  let validator: LinkValidator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-validator-test-'));
    validator = new LinkValidator(tempDir);
    mockFetch.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.resetAllMocks();
  });

  describe('extractLinks', () => {
    it('should extract markdown links', () => {
      const content = `
# Test Document

See [documentation](docs/readme.md) for more info.
Visit [our website](https://example.com) for updates.
Contact us at [email](mailto:test@example.com).
      `.trim();

      const links = validator.extractLinks(content, 'test.md');

      expect(links).toHaveLength(3);
      expect(links[0].url).toBe('docs/readme.md');
      expect(links[0].type).toBe('internal');
      expect(links[1].url).toBe('https://example.com');
      expect(links[1].type).toBe('https');
      expect(links[2].url).toBe('mailto:test@example.com');
      expect(links[2].type).toBe('mailto');
    });

    it('should extract autolinks', () => {
      const content = `
Visit <https://example.com> for more information.
Also check <http://test.org> for updates.
      `.trim();

      const links = validator.extractLinks(content, 'test.md');

      expect(links).toHaveLength(2);
      expect(links[0].url).toBe('https://example.com');
      expect(links[0].type).toBe('https');
      expect(links[1].url).toBe('http://test.org');
      expect(links[1].type).toBe('http');
    });

    it('should extract plain URLs', () => {
      const content = `
Visit https://example.com for more info.
Also see http://test.org for updates.
      `.trim();

      const links = validator.extractLinks(content, 'test.md');

      expect(links).toHaveLength(2);
      expect(links[0].url).toBe('https://example.com');
      expect(links[1].url).toBe('http://test.org');
    });

    it('should extract anchor links', () => {
      const content = `
See [installation section](#installation) below.
Check [config in other file](config.md#settings).
      `.trim();

      const links = validator.extractLinks(content, 'test.md');

      expect(links).toHaveLength(2);
      expect(links[0].url).toBe('#installation');
      expect(links[0].type).toBe('anchor');
      expect(links[0].anchor).toBe('installation');
      expect(links[1].url).toBe('config.md#settings');
      expect(links[1].type).toBe('anchor');
      expect(links[1].anchor).toBe('settings');
    });

    it('should deduplicate links from same line', () => {
      const content = `
Visit [example](https://example.com) and also [example again](https://example.com).
      `.trim();

      const links = validator.extractLinks(content, 'test.md');

      expect(links).toHaveLength(1);
    });

    it('should handle link titles', () => {
      const content = `
See [documentation](docs/readme.md "Read the docs") for more info.
      `.trim();

      const links = validator.extractLinks(content, 'test.md');

      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('docs/readme.md');
    });
  });

  describe('validateHttpUrl', () => {
    it('should validate successful HTTP responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const link: LinkReference = {
        url: 'https://example.com',
        type: 'https',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const result = await validator.validateLink(link, 'test.md');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
        method: 'HEAD',
        signal: expect.any(AbortSignal),
        headers: { 'User-Agent': 'DocTool Link Validator' }
      });
    });

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const link: LinkReference = {
        url: 'https://example.com/missing',
        type: 'https',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const result = await validator.validateLink(link, 'test.md');

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('error'); // 404 is permanent
      expect(result.issues[0].message).toContain('404');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const link: LinkReference = {
        url: 'https://unreachable.example',
        type: 'https',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const result = await validator.validateLink(link, 'test.md');

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('warning'); // Network errors are temporary
    });

    it('should handle timeouts', async () => {
      const validator = new LinkValidator(tempDir, 100); // Short timeout
      
      // Mock fetch to throw AbortError after delay
      mockFetch.mockImplementationOnce(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const error = new Error('Request timeout');
            error.name = 'AbortError';
            reject(error);
          }, 150);
        });
      });

      const link: LinkReference = {
        url: 'https://slow.example',
        type: 'https',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const result = await validator.validateLink(link, 'test.md');

      expect(result.valid).toBe(false);
      expect(result.issues[0].message).toContain('timeout');
    });
  });

  describe('validateInternalLink', () => {
    beforeEach(() => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'existing.md'), '# Existing File');
      fs.mkdirSync(path.join(tempDir, 'docs'));
      fs.writeFileSync(path.join(tempDir, 'docs', 'readme.md'), '# Documentation');
    });

    it('should validate existing internal links', async () => {
      const link: LinkReference = {
        url: 'existing.md',
        type: 'internal',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing internal links', async () => {
      const link: LinkReference = {
        url: 'missing.md',
        type: 'internal',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing_file');
    });

    it('should validate relative paths', async () => {
      const link: LinkReference = {
        url: 'docs/readme.md',
        type: 'internal',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should suggest similar files for missing links', async () => {
      // Create a similar file
      fs.writeFileSync(path.join(tempDir, 'configuration.md'), '# Config');

      const link: LinkReference = {
        url: 'config.md', // Missing, but configuration.md exists
        type: 'internal',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(false);
      expect(result.issues[0].suggestion).toContain('configuration.md');
    });
  });

  describe('validateAnchorLink', () => {
    beforeEach(() => {
      // Create test file with headings
      const content = `
# Main Title

## Installation

### Prerequisites

## Configuration

### Settings
      `.trim();
      fs.writeFileSync(path.join(tempDir, 'test.md'), content);
    });

    it('should validate existing anchor links in same file', async () => {
      const link: LinkReference = {
        url: '#installation',
        type: 'anchor',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown',
        anchor: 'installation'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate anchor links with different casing', async () => {
      const link: LinkReference = {
        url: '#INSTALLATION',
        type: 'anchor',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown',
        anchor: 'INSTALLATION'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(true);
    });

    it('should detect missing anchor links', async () => {
      const link: LinkReference = {
        url: '#missing-section',
        type: 'anchor',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown',
        anchor: 'missing-section'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('warning');
    });

    it('should suggest similar headings', async () => {
      const link: LinkReference = {
        url: '#config',
        type: 'anchor',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown',
        anchor: 'config'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(false);
      expect(result.issues[0].suggestion).toContain('Configuration');
    });

    it('should validate anchor links to other files', async () => {
      // Create another file with headings
      fs.writeFileSync(path.join(tempDir, 'other.md'), '# Other\n\n## Features');

      const link: LinkReference = {
        url: 'other.md#features',
        type: 'anchor',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown',
        anchor: 'features'
      };

      const docPath = path.join(tempDir, 'test.md');
      const result = await validator.validateLink(link, docPath);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateEmailAddress', () => {
    it('should validate correct email addresses', async () => {
      const link: LinkReference = {
        url: 'mailto:test@example.com',
        type: 'mailto',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const result = await validator.validateLink(link, 'test.md');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid email addresses', async () => {
      const link: LinkReference = {
        url: 'mailto:invalid-email',
        type: 'mailto',
        mentioned_in: { file: 'test.md', line: 1, context: 'test' },
        status: 'unknown'
      };

      const result = await validator.validateLink(link, 'test.md');

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].message).toContain('Invalid email address');
    });
  });

  describe('validateDocumentationFile', () => {
    it('should validate a complete documentation file', async () => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'config.md'), '# Configuration');
      
      // Mock successful HTTP response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const docContent = `
# Test Project

## Links

Check [configuration](config.md) for settings.
Visit [our website](https://example.com) for updates.
See [installation](#installation) section below.

## Installation

Installation instructions here.
      `.trim();

      const docPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(docPath, docContent);

      const issues = await validator.validateDocumentationFile(docPath);

      // Should have no issues - config.md exists, URL works, anchor exists
      expect(issues).toHaveLength(0);
    });

    it('should detect multiple types of broken links', async () => {
      // Mock failed HTTP response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const docContent = `
# Test Project

Check [missing file](missing.md) for info.
Visit [broken website](https://broken.example) for updates.
See [missing section](#missing) below.
      `.trim();

      const docPath = path.join(tempDir, 'test.md');
      fs.writeFileSync(docPath, docContent);

      const issues = await validator.validateDocumentationFile(docPath);

      expect(issues).toHaveLength(3);
      
      // Check issue types
      const issueTypes = issues.map(i => i.message);
      expect(issueTypes.some(msg => msg.includes('missing.md'))).toBe(true);
      expect(issueTypes.some(msg => msg.includes('broken.example'))).toBe(true);
      expect(issueTypes.some(msg => msg.includes('missing'))).toBe(true);
    });
  });

  describe('helper methods', () => {
    it('should normalize anchors correctly', () => {
      const validator = new LinkValidator();
      
      // Access private method through type assertion for testing
      const normalize = (validator as unknown as { normalizeAnchor: (anchor: string) => string }).normalizeAnchor.bind(validator);
      
      expect(normalize('Installation Guide')).toBe('installation-guide');
      expect(normalize('API & SDK')).toBe('api-sdk');
      expect(normalize('Getting Started!')).toBe('getting-started');
      expect(normalize('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });

    it('should extract headings correctly', () => {
      const content = `
# Main Title
Some content here.

## Secondary Heading

### Tertiary Heading ###

#### Another Heading
      `.trim();

      const validator = new LinkValidator();
      const headings = (validator as unknown as { extractHeadings: (content: string) => string[] }).extractHeadings(content);

      expect(headings).toEqual([
        'Main Title',
        'Secondary Heading', 
        'Tertiary Heading',
        'Another Heading'
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty documentation files', async () => {
      const docPath = path.join(tempDir, 'empty.md');
      fs.writeFileSync(docPath, '');

      const issues = await validator.validateDocumentationFile(docPath);
      expect(issues).toHaveLength(0);
    });

    it('should handle files with no links', async () => {
      const docContent = `
# Pure Text Document

This document contains no links.
Just some regular text and explanations.
      `.trim();

      const docPath = path.join(tempDir, 'no-links.md');
      fs.writeFileSync(docPath, docContent);

      const issues = await validator.validateDocumentationFile(docPath);
      expect(issues).toHaveLength(0);
    });

    it('should handle file reading errors gracefully', async () => {
      const nonExistentDoc = path.join(tempDir, 'missing-doc.md');
      const issues = await validator.validateDocumentationFile(nonExistentDoc);

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('invalid_path');
      expect(issues[0].severity).toBe('error');
    });
  });
});
