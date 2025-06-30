import * as fs from 'fs';
import * as path from 'path';

interface DirectoryInfo {
  name: string;
  path: string;
  hasKnowledgeFile: boolean;
  knowledgeFilePath?: string;
  files: string[];
  subdirectories: string[];
}

// Folders to exclude from knowledge file creation
const EXCLUDED_FOLDERS = new Set([
  '.git',
  'node_modules',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'coverage',
  '.nyc_output',
  '.next',
  '.nuxt',
  'out',
  'temp',
  'tmp',
  '.cache',
  '.parcel-cache'
]);

// Known knowledge file names (in order of preference)
const KNOWLEDGE_FILE_NAMES = [
  'KNOWLEDGE.md',
  'knowledge.md',
  'README.md'
];

/**
 * Scans a directory and returns information about its contents
 */
export function scanDirectory(dirPath: string): DirectoryInfo {
  const dirName = path.basename(dirPath);
  const files: string[] = [];
  const subdirectories: string[] = [];
  
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isFile()) {
        files.push(item.name);
      } else if (item.isDirectory() && !item.name.startsWith('.')) {
        subdirectories.push(item.name);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error);
  }

  // Check if a knowledge file already exists
  let hasKnowledgeFile = false;
  let knowledgeFilePath: string | undefined;

  for (const fileName of KNOWLEDGE_FILE_NAMES) {
    const filePath = path.join(dirPath, fileName);
    if (fs.existsSync(filePath)) {
      hasKnowledgeFile = true;
      knowledgeFilePath = filePath;
      break;
    }
  }

  return {
    name: dirName,
    path: dirPath,
    hasKnowledgeFile,
    knowledgeFilePath,
    files,
    subdirectories
  };
}

/**
 * Gets all directories recursively that should have knowledge files
 */
export function getDirectoriesForKnowledgeFiles(basePath: string = process.cwd()): DirectoryInfo[] {
  const directories: DirectoryInfo[] = [];
  
  function scanRecursively(currentPath: string) {
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory() && !EXCLUDED_FOLDERS.has(item.name) && !item.name.startsWith('.')) {
          const dirPath = path.join(currentPath, item.name);
          const dirInfo = scanDirectory(dirPath);
          directories.push(dirInfo);
          
          // Recursively scan subdirectories
          scanRecursively(dirPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentPath}:`, error);
    }
  }
  
  // Start recursive scanning from the base path
  scanRecursively(basePath);
  
  return directories;
}

/**
 * Creates a knowledge file template for a directory
 */
export function createKnowledgeFileTemplate(dirInfo: DirectoryInfo): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `# ${dirInfo.name}

## Overview

This directory contains [brief description of the directory's purpose].

## Contents

### Files
${dirInfo.files.length > 0 
  ? dirInfo.files.map(file => `- \`${file}\` - [description]`).join('\n')
  : '- No files in this directory'
}

### Subdirectories
${dirInfo.subdirectories.length > 0
  ? dirInfo.subdirectories.map(dir => `- \`${dir}/\` - [description]`).join('\n')
  : '- No subdirectories'
}

## Purpose

[Describe the role this directory plays in the overall project]

## Key Components

[List and describe important files or modules in this directory]

## Dependencies

[List any dependencies or relationships with other parts of the project]

## Notes

[Any additional notes, warnings, or important information]

---

*Created: ${date}*
*This file was generated automatically and should be updated with relevant information.*
`;
}

/**
 * Creates a knowledge file for a directory if one doesn't exist
 */
export function createKnowledgeFile(dirInfo: DirectoryInfo): boolean {
  if (dirInfo.hasKnowledgeFile) {
    console.log(`Knowledge file already exists for ${dirInfo.name}: ${dirInfo.knowledgeFilePath}`);
    return false;
  }

  const knowledgeFilePath = path.join(dirInfo.path, 'knowledge.md');
  const template = createKnowledgeFileTemplate(dirInfo);

  try {
    fs.writeFileSync(knowledgeFilePath, template, 'utf8');
    console.log(`Created knowledge file: ${knowledgeFilePath}`);
    return true;
  } catch (error) {
    console.error(`Error creating knowledge file for ${dirInfo.name}:`, error);
    return false;
  }
}

/**
 * Main function to scan directories and create knowledge files where needed
 */
export function initializeKnowledgeFiles(basePath: string = process.cwd()): void {
  console.log(`Scanning directories in: ${basePath}`);
  
  const directories = getDirectoriesForKnowledgeFiles(basePath);
  let createdCount = 0;
  let existingCount = 0;

  for (const dirInfo of directories) {
    if (createKnowledgeFile(dirInfo)) {
      createdCount++;
    } else {
      existingCount++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`- Directories scanned: ${directories.length}`);
  console.log(`- Knowledge files created: ${createdCount}`);
  console.log(`- Knowledge files already existed: ${existingCount}`);
  
  if (createdCount > 0) {
    console.log(`\nNote: Created knowledge files contain templates. Please update them with relevant information.`);
  }
}
