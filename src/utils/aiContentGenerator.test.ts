import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
  analyzeDirectoryForContent, 
  getCodeContent, 
  createContentGenerationPrompt,
  generateKnowledgeContent,
  updateKnowledgeFile,
  needsAIEnhancement,
  enhanceKnowledgeFiles
} from './aiContentGenerator';

describe('AI Content Generator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-content-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('analyzeDirectoryForContent', () => {
    it('should analyze directory contents correctly', () => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'test.ts'), 'console.log("test");');
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'readme.md'), '# Test');
      fs.mkdirSync(path.join(tempDir, 'subdir'));

      const analysis = analyzeDirectoryForContent(tempDir);

      expect(analysis.name).toBe(path.basename(tempDir));
      expect(analysis.path).toBe(tempDir);
      expect(analysis.files).toContain('test.ts');
      expect(analysis.files).toContain('config.json');
      expect(analysis.files).toContain('readme.md');
      expect(analysis.subdirectories).toContain('subdir');
      expect(analysis.codeFiles).toContain('test.ts');
      expect(analysis.codeFiles).not.toContain('config.json');
    });

    it('should read existing knowledge file content', () => {
      const knowledgeContent = '# Test Knowledge\nThis is test content.';
      fs.writeFileSync(path.join(tempDir, 'knowledge.md'), knowledgeContent);

      const analysis = analyzeDirectoryForContent(tempDir);

      expect(analysis.currentKnowledgeContent).toBe(knowledgeContent);
    });

    it('should handle missing directory gracefully', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent');
      const analysis = analyzeDirectoryForContent(nonExistentPath);

      expect(analysis.files).toEqual([]);
      expect(analysis.subdirectories).toEqual([]);
      expect(analysis.codeFiles).toEqual([]);
    });
  });

  describe('getCodeContent', () => {
    it('should read code file contents', () => {
      const tsContent = 'export function test() { return "hello"; }';
      const jsContent = 'function legacy() { return "world"; }';
      
      fs.writeFileSync(path.join(tempDir, 'test.ts'), tsContent);
      fs.writeFileSync(path.join(tempDir, 'legacy.js'), jsContent);

      const codeContent = getCodeContent(tempDir, ['test.ts', 'legacy.js']);

      expect(codeContent['test.ts']).toBe(tsContent);
      expect(codeContent['legacy.js']).toBe(jsContent);
    });

    it('should handle missing files gracefully', () => {
      const codeContent = getCodeContent(tempDir, ['missing.ts', 'also-missing.js']);

      expect(Object.keys(codeContent)).toHaveLength(0);
    });
  });

  describe('createContentGenerationPrompt', () => {
    it('should create comprehensive prompt', () => {
      const analysis = {
        name: 'test-dir',
        path: tempDir,
        files: ['index.ts', 'config.json'],
        subdirectories: ['lib'],
        codeFiles: ['index.ts'],
        currentKnowledgeContent: '# Old Content'
      };

      const codeContent = {
        'index.ts': 'export const version = "1.0.0";'
      };

      const prompt = createContentGenerationPrompt(analysis, codeContent);

      expect(prompt).toContain('**Directory:** test-dir');
      expect(prompt).toContain('- index.ts');
      expect(prompt).toContain('- config.json');
      expect(prompt).toContain('- lib/');
      expect(prompt).toContain('```typescript');
      expect(prompt).toContain('export const version = "1.0.0";');
      expect(prompt).toContain('**Current knowledge file content:**');
      expect(prompt).toContain('# Old Content');
    });

    it('should handle directory with no existing knowledge file', () => {
      const analysis = {
        name: 'new-dir',
        path: tempDir,
        files: ['app.ts'],
        subdirectories: [],
        codeFiles: ['app.ts']
      };

      const prompt = createContentGenerationPrompt(analysis, {});

      expect(prompt).toContain('No existing knowledge file found');
      expect(prompt).toContain('create comprehensive content from scratch');
    });
  });

  describe('generateKnowledgeContent', () => {
    it('should generate content for a TypeScript directory', async () => {
      // Create a test TypeScript file
      const tsContent = `
export class TestValidator {
  validate(input: string): boolean {
    return input.length > 0;
  }
}

export function helper() {
  return "utility function";
}
`;
      fs.writeFileSync(path.join(tempDir, 'validator.ts'), tsContent);
      fs.writeFileSync(path.join(tempDir, 'validator.test.ts'), 'it("should work", () => {});');

      const content = await generateKnowledgeContent(tempDir);

      expect(content).toBeTruthy();
      expect(content).toContain(`# ${path.basename(tempDir)}`);
      expect(content).toContain('## Overview');
      expect(content).toContain('## Contents');
      expect(content).toContain('validator.ts');
      expect(content).toContain('validator.test.ts');
      expect(content).toContain('TestValidator');
    });

    it('should generate content for utils directory', async () => {
      const utilsTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utils-'));
      
      try {
        fs.writeFileSync(path.join(utilsTempDir, 'helpers.ts'), 'export function format() {}');
        
        const content = await generateKnowledgeContent(utilsTempDir);
        
        expect(content).toContain('utility functions');
        expect(content).toContain('helper modules');
      } finally {
        fs.rmSync(utilsTempDir, { recursive: true, force: true });
      }
    });
  });

  describe('updateKnowledgeFile', () => {
    it('should create knowledge file with timestamp', () => {
      const content = '# Test Directory\n\nThis is test content.';
      
      const success = updateKnowledgeFile(tempDir, content);
      
      expect(success).toBe(true);
      
      const knowledgeFilePath = path.join(tempDir, 'knowledge.md');
      expect(fs.existsSync(knowledgeFilePath)).toBe(true);
      
      const fileContent = fs.readFileSync(knowledgeFilePath, 'utf8');
      expect(fileContent).toContain('# Test Directory');
      expect(fileContent).toContain('This is test content.');
      expect(fileContent).toContain('*Last updated:');
      expect(fileContent).toContain('*Content generated with AI assistance*');
    });

    it('should handle write errors gracefully', () => {
      // Try to write to a path that doesn't exist
      const invalidPath = path.join(tempDir, 'nonexistent', 'subdir');
      
      const success = updateKnowledgeFile(invalidPath, 'test content');
      
      expect(success).toBe(false);
    });
  });

  describe('needsAIEnhancement', () => {
    it('should detect template placeholders', () => {
      const templateContent = `
# test

## Overview

This directory contains [brief description of the directory's purpose].

## Contents

### Files
- \`file.ts\` - [description]
`;

      expect(needsAIEnhancement(templateContent)).toBe(true);
    });

    it('should detect generated content marker', () => {
      const generatedContent = `
# test

Some content here.

This file was generated automatically and should be updated with relevant information.
`;

      expect(needsAIEnhancement(generatedContent)).toBe(true);
    });

    it('should not flag enhanced content', () => {
      const enhancedContent = `
# test

## Overview

This directory contains utility functions for the application.

## Contents

### Files
- \`helpers.ts\` - Utility functions for common operations

## Purpose

This directory serves as a centralized location for reusable code.
`;

      expect(needsAIEnhancement(enhancedContent)).toBe(false);
    });
  });

  describe('enhanceKnowledgeFiles', () => {
    it('should enhance knowledge files that need improvement', async () => {
      // Create a template knowledge file
      const templateContent = `# test

## Overview

This directory contains [brief description of the directory's purpose].

## Contents

### Files
- \`app.ts\` - [description]

---

*Created: 2025-06-30*
*This file was generated automatically and should be updated with relevant information.*`;

      fs.writeFileSync(path.join(tempDir, 'knowledge.md'), templateContent);
      fs.writeFileSync(path.join(tempDir, 'app.ts'), 'export const app = "test";');

      await enhanceKnowledgeFiles(tempDir);

      const enhancedContent = fs.readFileSync(path.join(tempDir, 'knowledge.md'), 'utf8');
      
      expect(enhancedContent).not.toContain('[brief description of the directory\'s purpose]');
      expect(enhancedContent).not.toContain('[description]');
      expect(enhancedContent).toContain('*Content generated with AI assistance*');
    });

    it('should skip already enhanced files', async () => {
      // Create an already enhanced knowledge file
      const enhancedContent = `# test

## Overview

This directory contains core application logic.

## Contents

### Files
- \`app.ts\` - Main application entry point

---

*Last updated: 2025-06-30*
*Content generated with AI assistance*`;

      fs.writeFileSync(path.join(tempDir, 'knowledge.md'), enhancedContent);

      await enhanceKnowledgeFiles(tempDir);

      // Content should remain the same (file was already enhanced)
      const finalContent = fs.readFileSync(path.join(tempDir, 'knowledge.md'), 'utf8');
      expect(finalContent).toBe(enhancedContent);
    });
  });
});
