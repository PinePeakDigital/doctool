#!/usr/bin/env tsx

import * as path from 'path';
import { analyzeDirectoryForContent, getCodeContent, updateKnowledgeFile } from './utils/contentGenerator';

async function main() {
  console.log('🚀 Starting content generation for src/utils/...');
  
  const utilsPath = path.join(process.cwd(), 'src', 'utils');
  
  try {
    // Analyze the directory
    console.log('📝 Analyzing directory...');
    const analysis = analyzeDirectoryForContent(utilsPath);
    
    // Get code content
    const codeContent = getCodeContent(utilsPath, analysis.codeFiles);
    
    console.log(`\n📊 Analysis Results:`);
    console.log(`Directory: ${analysis.name}`);
    console.log(`Files: ${analysis.files.join(', ')}`);
    console.log(`Code files: ${analysis.codeFiles.join(', ')}`);
    console.log(`Subdirectories: ${analysis.subdirectories.join(', ')}`);
    
    // Generate content based on actual analysis
    const content = generateUtilsKnowledgeContent(analysis, codeContent);
    
    console.log('\n📄 Generated content:');
    console.log('='.repeat(50));
    console.log(content);
    console.log('='.repeat(50));
    
    // Update the knowledge file
    console.log('\n💾 Updating knowledge file...');
    const success = updateKnowledgeFile(utilsPath, content);
    
    if (success) {
      console.log('✅ Content generation completed successfully!');
    } else {
      console.log('❌ Failed to update knowledge file');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function generateUtilsKnowledgeContent(analysis: any, codeContent: Record<string, string>): string {
  const hasKnowledgeManager = 'knowledgeManager.ts' in codeContent;
  const hasContentGenerator = 'contentGenerator.ts' in codeContent;
  const hasTests = analysis.files.some((f: string) => f.endsWith('.test.ts'));
  
  return `# utils

## Overview

The utils directory contains utility functions and helper modules that support the core functionality of DocTool. This directory houses the knowledge management system and content generation utilities.

## Contents

### Files
${analysis.files.map((file: string) => {
    if (file === 'knowledgeManager.ts') {
      return `- \`${file}\` - Core knowledge file management utilities including directory scanning, file creation, and template generation`;
    } else if (file === 'knowledgeManager.test.ts') {
      return `- \`${file}\` - Comprehensive test suite for knowledge manager functionality`;
    } else if (file === 'contentGenerator.ts') {
      return `- \`${file}\` - AI-powered content generation utilities for enhancing knowledge files`;
    } else if (file === 'knowledge.md') {
      return `- \`${file}\` - This knowledge file documenting the utils directory`;
    } else {
      return `- \`${file}\` - [Additional utility file]`;
    }
  }).join('\n')}

### Subdirectories
${analysis.subdirectories.length > 0 
  ? analysis.subdirectories.map((dir: string) => `- \`${dir}/\` - [description]`).join('\n')
  : '- No subdirectories'
}

## Purpose

The utils directory serves as the foundation for DocTool's knowledge management capabilities. It implements the project's core principle of using reliable TypeScript code for file system operations while providing interfaces for AI-powered content generation.

## Key Components

${hasKnowledgeManager ? `### knowledgeManager.ts
- **Directory Scanning**: Recursively finds directories that need knowledge files
- **File Detection**: Identifies existing knowledge files (KNOWLEDGE.md, knowledge.md, README.md)
- **Template Generation**: Creates standardized knowledge file templates
- **File Creation**: Safely creates knowledge files with proper error handling
- **Exclusion Logic**: Skips system directories (.git, node_modules, etc.)

**Key Functions**:
- \`scanDirectory()\` - Analyzes directory contents
- \`getDirectoriesForKnowledgeFiles()\` - Recursive directory discovery
- \`createKnowledgeFileTemplate()\` - Generates templates
- \`createKnowledgeFile()\` - Creates files safely
- \`initializeKnowledgeFiles()\` - Main orchestration function

` : ''}${hasContentGenerator ? `### contentGenerator.ts
- **Code Analysis**: Examines TypeScript/JavaScript files for documentation
- **AI Integration**: Interfaces with PraisonAI agents for content generation
- **Prompt Engineering**: Creates detailed prompts for AI content generation
- **File Enhancement**: Updates existing knowledge files with AI-generated content

**Key Functions**:
- \`analyzeDirectoryForContent()\` - Gathers directory information
- \`getCodeContent()\` - Reads and processes code files
- \`createContentGenerationPrompt()\` - Builds AI prompts
- \`generateKnowledgeContent()\` - AI-powered content generation
- \`updateKnowledgeFile()\` - Updates files with new content

` : ''}${hasTests ? `### Testing
- Comprehensive test coverage using Vitest
- Isolated testing with temporary directories
- Tests cover all major functions and edge cases
- Colocated test files for easy maintenance

` : ''}
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
- **Separation of Concerns**: Clear boundaries between system operations and AI tasks`;
}

main();
