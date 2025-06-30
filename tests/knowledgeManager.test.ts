import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  scanDirectory,
  getDirectoriesForKnowledgeFiles,
  createKnowledgeFileTemplate,
  createKnowledgeFile,
  initializeKnowledgeFiles
} from '../src/utils/knowledgeManager';

describe('Knowledge Manager', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Clean up
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('scanDirectory', () => {
    it('should scan a directory and return correct information', () => {
      // Setup test directory structure
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content');
      fs.writeFileSync(path.join(tempDir, 'file2.js'), 'console.log("test")');
      fs.mkdirSync(path.join(tempDir, 'subdir1'));
      fs.mkdirSync(path.join(tempDir, 'subdir2'));
      fs.mkdirSync(path.join(tempDir, '.hidden')); // Should be ignored

      const result = scanDirectory(tempDir);

      expect(result.name).toBe(path.basename(tempDir));
      expect(result.path).toBe(tempDir);
      expect(result.hasKnowledgeFile).toBe(false);
      expect(result.files).toEqual(expect.arrayContaining(['file1.txt', 'file2.js']));
      expect(result.subdirectories).toEqual(expect.arrayContaining(['subdir1', 'subdir2']));
      expect(result.subdirectories).not.toContain('.hidden');
    });

    it('should detect existing KNOWLEDGE.md file', () => {
      fs.writeFileSync(path.join(tempDir, 'KNOWLEDGE.md'), '# Test');

      const result = scanDirectory(tempDir);

      expect(result.hasKnowledgeFile).toBe(true);
      expect(result.knowledgeFilePath).toBe(path.join(tempDir, 'KNOWLEDGE.md'));
    });

    it('should detect existing knowledge.md file', () => {
      fs.writeFileSync(path.join(tempDir, 'knowledge.md'), '# Test');

      const result = scanDirectory(tempDir);

      expect(result.hasKnowledgeFile).toBe(true);
      expect(result.knowledgeFilePath).toBe(path.join(tempDir, 'knowledge.md'));
    });

    it('should detect existing README.md file', () => {
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Test');

      const result = scanDirectory(tempDir);

      expect(result.hasKnowledgeFile).toBe(true);
      expect(result.knowledgeFilePath).toBe(path.join(tempDir, 'README.md'));
    });

    it('should prefer KNOWLEDGE.md over other files', () => {
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# README');
      fs.writeFileSync(path.join(tempDir, 'KNOWLEDGE.md'), '# KNOWLEDGE');

      const result = scanDirectory(tempDir);

      expect(result.hasKnowledgeFile).toBe(true);
      expect(result.knowledgeFilePath).toBe(path.join(tempDir, 'KNOWLEDGE.md'));
    });
  });

  describe('getDirectoriesForKnowledgeFiles', () => {
    beforeEach(() => {
      // Create test directory structure
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.mkdirSync(path.join(tempDir, 'src', 'utils'));
      fs.mkdirSync(path.join(tempDir, 'src', 'agents'));
      fs.mkdirSync(path.join(tempDir, 'tests'));
      fs.mkdirSync(path.join(tempDir, 'node_modules')); // Should be excluded
      fs.mkdirSync(path.join(tempDir, '.git')); // Should be excluded
      fs.mkdirSync(path.join(tempDir, '.vscode')); // Should be excluded
    });

    it('should find all non-excluded directories recursively', () => {
      const directories = getDirectoriesForKnowledgeFiles(tempDir);

      const dirNames = directories.map(d => path.relative(tempDir, d.path));
      expect(dirNames).toEqual(expect.arrayContaining(['src', 'tests', 'src/utils', 'src/agents']));
      expect(dirNames).not.toContain('node_modules');
      expect(dirNames).not.toContain('.git');
      expect(dirNames).not.toContain('.vscode');
    });

    it('should handle empty directories', () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);

      const directories = getDirectoriesForKnowledgeFiles(tempDir);

      expect(directories.some(d => d.path === emptyDir)).toBe(true);
    });
  });

  describe('createKnowledgeFileTemplate', () => {
    it('should create a proper template with directory information', () => {
      const dirInfo = {
        name: 'test-dir',
        path: '/path/to/test-dir',
        hasKnowledgeFile: false,
        files: ['file1.ts', 'file2.js'],
        subdirectories: ['subdir1', 'subdir2']
      };

      const template = createKnowledgeFileTemplate(dirInfo);

      expect(template).toContain('# test-dir');
      expect(template).toContain('- `file1.ts` - [description]');
      expect(template).toContain('- `file2.js` - [description]');
      expect(template).toContain('- `subdir1/` - [description]');
      expect(template).toContain('- `subdir2/` - [description]');
      expect(template).toContain('## Overview');
      expect(template).toContain('## Contents');
      expect(template).toContain('## Purpose');
    });

    it('should handle directories with no files or subdirectories', () => {
      const dirInfo = {
        name: 'empty-dir',
        path: '/path/to/empty-dir',
        hasKnowledgeFile: false,
        files: [],
        subdirectories: []
      };

      const template = createKnowledgeFileTemplate(dirInfo);

      expect(template).toContain('- No files in this directory');
      expect(template).toContain('- No subdirectories');
    });

    it('should include current date', () => {
      const dirInfo = {
        name: 'test-dir',
        path: '/path/to/test-dir',
        hasKnowledgeFile: false,
        files: [],
        subdirectories: []
      };

      const template = createKnowledgeFileTemplate(dirInfo);
      const currentDate = new Date().toISOString().split('T')[0];

      expect(template).toContain(`*Created: ${currentDate}*`);
    });
  });

  describe('createKnowledgeFile', () => {
    it('should create a knowledge file when none exists', () => {
      const dirInfo = {
        name: 'test-dir',
        path: tempDir,
        hasKnowledgeFile: false,
        files: ['test.txt'],
        subdirectories: ['subdir']
      };

      const result = createKnowledgeFile(dirInfo);

      expect(result).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'knowledge.md'))).toBe(true);

      const content = fs.readFileSync(path.join(tempDir, 'knowledge.md'), 'utf8');
      expect(content).toContain('# test-dir');
      expect(content).toContain('- `test.txt` - [description]');
    });

    it('should not create a file when one already exists', () => {
      fs.writeFileSync(path.join(tempDir, 'KNOWLEDGE.md'), 'existing content');

      const dirInfo = {
        name: 'test-dir',
        path: tempDir,
        hasKnowledgeFile: true,
        knowledgeFilePath: path.join(tempDir, 'KNOWLEDGE.md'),
        files: [],
        subdirectories: []
      };

      const result = createKnowledgeFile(dirInfo);

      expect(result).toBe(false);
      expect(fs.readFileSync(path.join(tempDir, 'KNOWLEDGE.md'), 'utf8')).toBe('existing content');
    });
  });

  describe('initializeKnowledgeFiles', () => {
    beforeEach(() => {
      // Create a more complex directory structure
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.mkdirSync(path.join(tempDir, 'src', 'utils'));
      fs.mkdirSync(path.join(tempDir, 'tests'));
      fs.writeFileSync(path.join(tempDir, 'src', 'KNOWLEDGE.md'), 'existing');
    });

    it('should initialize knowledge files for all directories', () => {
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      initializeKnowledgeFiles(tempDir);

      // Check that knowledge files were created
      expect(fs.existsSync(path.join(tempDir, 'knowledge.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'src', 'utils', 'knowledge.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'tests', 'knowledge.md'))).toBe(true);

      // Check that existing file was not overwritten
      expect(fs.readFileSync(path.join(tempDir, 'src', 'KNOWLEDGE.md'), 'utf8')).toBe('existing');

      // Check console output
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Scanning directories in:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Summary:'));

      consoleSpy.mockRestore();
    });

    it('should handle directories where all knowledge files already exist', () => {
      // Create knowledge files in all directories first
      fs.writeFileSync(path.join(tempDir, 'KNOWLEDGE.md'), 'root');
      fs.writeFileSync(path.join(tempDir, 'src', 'utils', 'knowledge.md'), 'utils');
      fs.writeFileSync(path.join(tempDir, 'tests', 'README.md'), 'tests');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      initializeKnowledgeFiles(tempDir);

      // Should report that no new files were created
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Knowledge files created: 0'));

      consoleSpy.mockRestore();
    });
  });
});
