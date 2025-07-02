# utils

## Overview

The utils directory contains utility functions and helper modules that support the core functionality of DocTool. This directory houses the knowledge management system and content generation utilities.

## Contents

### Files
- `aiContentGenerator.test.ts` - Test file for aiContentGenerator.test functionality
- `aiContentGenerator.ts` - Contains 1 class with core functionality
- `apiKeyValidator.test.ts` - Test file for apiKeyValidator.test functionality
- `apiKeyValidator.ts` - Defines 1 interface for type safety
- `contentGenerator.ts` - AI-powered content generation utilities for enhancing knowledge files
- `diffUtils.test.ts` - Test file for diffUtils.test functionality
- `diffUtils.ts` - Defines 3 interfaces for type safety
- `documentationFixer.ts` - Defines 2 interfaces for type safety
- `documentationIssues.ts` - Defines 2 interfaces for type safety
- `fileSystemValidator.test.ts` - Test file for fileSystemValidator.test functionality
- `fileSystemValidator.ts` - Contains 1 class with core functionality
- `gitUtils.test.ts` - Test file for gitUtils.test functionality
- `gitUtils.ts` - TypeScript/JavaScript module containing gitUtils functionality
- `knowledge.md` - This knowledge file documenting the utils directory
- `knowledgeManager.test.ts` - Comprehensive test suite for knowledge manager functionality
- `knowledgeManager.ts` - Core knowledge file management utilities including directory scanning, file creation, and template generation
- `linkValidator.test.ts` - Test file for linkValidator.test functionality
- `linkValidator.ts` - TypeScript/JavaScript module containing linkValidator functionality

### Subdirectories
- No subdirectories

## Purpose

The utils directory serves as the foundation for DocTool's knowledge management capabilities. It implements the project's core principle of using reliable TypeScript code for file system operations while providing interfaces for AI-powered content generation.

## Key Components

### knowledgeManager.ts
- **Directory Scanning**: Recursively finds directories that need knowledge files
- **File Detection**: Identifies existing knowledge files (KNOWLEDGE.md, knowledge.md, README.md)
- **Template Generation**: Creates standardized knowledge file templates
- **File Creation**: Safely creates knowledge files with proper error handling
- **Exclusion Logic**: Skips system directories (.git, node_modules, etc.)

**Key Functions**:
- `scanDirectory()` - Analyzes directory contents
- `getDirectoriesForKnowledgeFiles()` - Recursive directory discovery
- `createKnowledgeFileTemplate()` - Generates templates
- `createKnowledgeFile()` - Creates files safely
- `initializeKnowledgeFiles()` - Main orchestration function

### contentGenerator.ts
- **Code Analysis**: Examines TypeScript/JavaScript files for documentation
- **AI Integration**: Interfaces with PraisonAI agents for content generation
- **Prompt Engineering**: Creates detailed prompts for AI content generation
- **File Enhancement**: Updates existing knowledge files with AI-generated content

**Key Functions**:
- `analyzeDirectoryForContent()` - Gathers directory information
- `getCodeContent()` - Reads and processes code files
- `createContentGenerationPrompt()` - Builds AI prompts
- `generateKnowledgeContent()` - AI-powered content generation
- `updateKnowledgeFile()` - Updates files with new content

### Testing
- Comprehensive test coverage using Vitest
- Isolated testing with temporary directories
- Tests cover all major functions and edge cases
- Colocated test files for easy maintenance


## Dependencies

### External Dependencies
- **Node.js fs/path modules**: File system operations
- **PraisonAI**: AI agent integration for content generation
- **Vitest**: Testing framework

### Internal Dependencies
- **src/agents/contentGeneratorAgent**: AI agent for content generation
- **Main application**: Used by src/index.ts for knowledge file initialization

## Notes

- All file operations use synchronous methods for reliability
- Error handling includes graceful degradation and warning messages
- Tests use temporary directories to avoid affecting the real project
- The knowledge manager follows the project principle of using regular code for system operations
- Content generation leverages AI for creative tasks while maintaining reliable infrastructure

## Architecture Principles

This directory exemplifies DocTool's hybrid approach:
- **Reliable Code**: File system operations, directory scanning, error handling
- **AI Enhancement**: Content generation, analysis, and documentation improvement
- **Separation of Concerns**: Clear boundaries between system operations and AI tasks

---

*Last updated: 2025-07-02*
*Content generated with AI assistance*