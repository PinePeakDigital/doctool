import * as fs from 'fs';
import * as path from 'path';

export interface FileReference {
  path: string;
  type: 'file' | 'directory' | 'unknown';
  mentioned_in: DocumentationLocation;
  exists: boolean;
  resolved_path?: string;
}

export interface DocumentationLocation {
  file: string;
  line: number;
  column?: number;
  context: string;
}

export interface ValidationIssue {
  type: 'missing_file' | 'missing_directory' | 'invalid_path' | 'directory_mismatch';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: DocumentationLocation;
  suggestion?: string;
  file_reference: FileReference;
}

export interface DirectoryStructureClaim {
  claimed_structure: string[];
  actual_structure: string[];
  location: DocumentationLocation;
  directory_path: string;
}

/**
 * Validates file system references in documentation files
 */
export class FileSystemValidator {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Validates all file references in a documentation file
   */
  public validateDocumentationFile(docFilePath: string): ValidationIssue[] {
    try {
      const content = fs.readFileSync(docFilePath, 'utf8');
      const fileReferences = this.extractFileReferences(content, docFilePath);
      const issues: ValidationIssue[] = [];

      for (const fileRef of fileReferences) {
        const validationIssues = this.validateFileReference(fileRef, docFilePath);
        issues.push(...validationIssues);
      }

      // Also validate any directory structure claims
      const directoryClaims = this.extractDirectoryStructureClaims(content, docFilePath);
      for (const claim of directoryClaims) {
        const directoryIssues = this.validateDirectoryStructure(claim);
        issues.push(...directoryIssues);
      }

      return issues;
    } catch (error) {
      return [{
        type: 'invalid_path',
        severity: 'error',
        message: `Could not read documentation file: ${error}`,
        location: {
          file: docFilePath,
          line: 1,
          context: 'File reading error'
        },
        file_reference: {
          path: docFilePath,
          type: 'file',
          mentioned_in: { file: docFilePath, line: 1, context: 'File reading error' },
          exists: false
        }
      }];
    }
  }

  /**
   * Extracts file and directory references from markdown content
   */
  public extractFileReferences(content: string, sourceFile: string): FileReference[] {
    const references: FileReference[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // Extract various types of file references

      // 1. Markdown links: [text](path) or [text](path "title")
      const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      while ((match = markdownLinkRegex.exec(line)) !== null) {
        const linkPath = match[2].split(' ')[0]; // Remove title if present
        if (!this.isUrl(linkPath) && !this.isMailto(linkPath)) {
          references.push({
            path: linkPath,
            type: this.guessPathType(linkPath),
            mentioned_in: {
              file: sourceFile,
              line: lineIndex + 1,
              column: match.index,
              context: line.trim()
            },
            exists: false // Will be determined later
          });
        }
      }

      // 2. Code blocks with file paths: `filename.ext`
      const codeBlockRegex = /`([^`]+)`/g;
      while ((match = codeBlockRegex.exec(line)) !== null) {
        const possiblePath = match[1];
        if (this.looksLikeFilePath(possiblePath)) {
          references.push({
            path: possiblePath,
            type: this.guessPathType(possiblePath),
            mentioned_in: {
              file: sourceFile,
              line: lineIndex + 1,
              column: match.index,
              context: line.trim()
            },
            exists: false
          });
        }
      }

      // 3. Directory references in text: "src/utils/" or "the config/ directory"
      const directoryRegex = /(?:^|\s)([\w\-.]+(?:\/[\w\-.]+)*\/?)(?=\s|$|[,.])/g;
      while ((match = directoryRegex.exec(line)) !== null) {
        const possiblePath = match[1];
        if (this.looksLikeDirectoryPath(possiblePath) && possiblePath.length > 2) {
          references.push({
            path: possiblePath,
            type: 'directory',
            mentioned_in: {
              file: sourceFile,
              line: lineIndex + 1,
              column: match.index,
              context: line.trim()
            },
            exists: false
          });
        }
      }

      // 4. File extensions and specific files: .env, package.json, etc.
      const commonFileRegex = /(?:^|\s)((?:package\.json|\.env|\.gitignore|Dockerfile|Makefile|README\.md|LICENSE|tsconfig\.json|\.npmrc|\.editorconfig)(?:\s|$|[,.])?)/g;
      while ((match = commonFileRegex.exec(line)) !== null) {
        const fileName = match[1].replace(/[,.\s]+$/, ''); // Remove trailing punctuation
        references.push({
          path: fileName,
          type: 'file',
          mentioned_in: {
            file: sourceFile,
            line: lineIndex + 1,
            column: match.index,
            context: line.trim()
          },
          exists: false
        });
      }
    });

    return this.deduplicateReferences(references);
  }

  /**
   * Extracts directory structure claims from documentation
   */
  public extractDirectoryStructureClaims(content: string, sourceFile: string): DirectoryStructureClaim[] {
    const claims: DirectoryStructureClaim[] = [];
    const lines = content.split('\n');
    
    let inDirectoryTree = false;
    let currentClaim: string[] = [];
    let claimStartLine = 0;
    let context = '';

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      // Detect start of directory tree structures
      if (trimmedLine.startsWith('```')) {
        if (!inDirectoryTree) {
          // Check if this looks like a directory tree
          const nextFewLines = lines.slice(lineIndex + 1, lineIndex + 5).join('\n');
          if (trimmedLine.includes('tree') || 
              nextFewLines.includes('├──') || 
              nextFewLines.includes('└──') ||
              nextFewLines.includes('│')) {
            inDirectoryTree = true;
            currentClaim = [];
            claimStartLine = lineIndex + 1;
            context = line.trim();
          }
        } else {
          // End of directory tree
          if (currentClaim.length > 0) {
            const directoryPath = this.inferDirectoryFromTree(currentClaim) || '.';
            claims.push({
              claimed_structure: [...currentClaim],
              actual_structure: [],
              location: {
                file: sourceFile,
                line: claimStartLine,
                context: context
              },
              directory_path: directoryPath
            });
          }
          inDirectoryTree = false;
          currentClaim = [];
        }
        return;
      }


      // Collect directory tree lines
      if (inDirectoryTree && (
          line.includes('├──') || 
          line.includes('└──') || 
          line.includes('│') ||
          /^[\s]*[\w\-.]+\/?$/.test(trimmedLine)
        )) {
        currentClaim.push(line);
      }
    });

    return claims;
  }

  /**
   * Validates a single file reference
   */
  public validateFileReference(fileRef: FileReference, docFilePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const basePath = path.dirname(docFilePath);
    
    // Resolve the path relative to the documentation file
    const resolvedPath = path.resolve(basePath, fileRef.path);
    fileRef.resolved_path = resolvedPath;

    try {
      const stats = fs.statSync(resolvedPath);
      fileRef.exists = true;

      // Check if the type matches what we expected
      if (fileRef.type === 'file' && !stats.isFile()) {
        issues.push({
          type: 'directory_mismatch',
          severity: 'warning',
          message: `Expected file but found directory: ${fileRef.path}`,
          location: fileRef.mentioned_in,
          suggestion: `Update documentation to reference ${fileRef.path}/ as a directory`,
          file_reference: fileRef
        });
      } else if (fileRef.type === 'directory' && !stats.isDirectory()) {
        issues.push({
          type: 'directory_mismatch',
          severity: 'warning',
          message: `Expected directory but found file: ${fileRef.path}`,
          location: fileRef.mentioned_in,
          suggestion: `Update documentation to reference ${fileRef.path} as a file`,
          file_reference: fileRef
        });
      }
    } catch {
      fileRef.exists = false;
      
      if (fileRef.type === 'file') {
        issues.push({
          type: 'missing_file',
          severity: 'error',
          message: `File not found: ${fileRef.path}`,
          location: fileRef.mentioned_in,
          suggestion: this.suggestFileAlternatives(fileRef.path, basePath),
          file_reference: fileRef
        });
      } else if (fileRef.type === 'directory') {
        issues.push({
          type: 'missing_directory',
          severity: 'error',
          message: `Directory not found: ${fileRef.path}`,
          location: fileRef.mentioned_in,
          suggestion: this.suggestDirectoryAlternatives(fileRef.path, basePath),
          file_reference: fileRef
        });
      }
    }

    return issues;
  }

  /**
   * Validates directory structure claims against actual file system
   */
  public validateDirectoryStructure(claim: DirectoryStructureClaim): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    try {
      const actualStructure = this.getActualDirectoryStructure(claim.directory_path);
      claim.actual_structure = actualStructure;

      const claimedFiles = this.extractFilesFromTreeStructure(claim.claimed_structure);
      const actualFiles = new Set(actualStructure);

      // Check for files mentioned in docs but missing from file system
      for (const claimedFile of claimedFiles) {
        if (!actualFiles.has(claimedFile)) {
          issues.push({
            type: 'missing_file',
            severity: 'warning',
            message: `File mentioned in directory structure but not found: ${claimedFile}`,
            location: claim.location,
            suggestion: `Check if ${claimedFile} exists or update the directory structure documentation`,
            file_reference: {
              path: claimedFile,
              type: 'file',
              mentioned_in: claim.location,
              exists: false
            }
          });
        }
      }

      // Note: We don't flag extra files as issues since documentation
      // doesn't need to be exhaustive
      
    } catch {
      issues.push({
        type: 'invalid_path',
        severity: 'error',
        message: `Could not read directory structure for: ${claim.directory_path}`,
        location: claim.location,
        file_reference: {
          path: claim.directory_path,
          type: 'directory',
          mentioned_in: claim.location,
          exists: false
        }
      });
    }

    return issues;
  }

  // Helper methods

  private isUrl(text: string): boolean {
    return text.startsWith('http://') || text.startsWith('https://') || text.startsWith('ftp://');
  }

  private isMailto(text: string): boolean {
    return text.startsWith('mailto:');
  }

  private guessPathType(filePath: string): 'file' | 'directory' | 'unknown' {
    if (filePath.endsWith('/')) return 'directory';
    // Files with extensions or starting with . (like .env)
    if (path.extname(filePath) || (filePath.startsWith('.') && filePath.includes('.'))) return 'file';
    // Paths with / but no extension are likely directories
    if (filePath.includes('/') && !filePath.includes('.')) return 'directory';
    // If it has an extension, it's a file
    if (filePath.includes('.')) return 'file';
    return 'unknown';
  }

  private looksLikeFilePath(text: string): boolean {
    // Simple heuristic: contains / or . and looks like a path
    return (text.includes('/') || text.includes('.')) && 
           text.length > 2 && 
           !text.includes(' ') &&
           !this.isUrl(text);
  }

  private looksLikeDirectoryPath(text: string): boolean {
    return text.includes('/') && 
           !text.includes('.') && 
           !text.includes(' ') && 
           text.length > 2;
  }

  private deduplicateReferences(references: FileReference[]): FileReference[] {
    const seen = new Set<string>();
    return references.filter(ref => {
      const key = `${ref.path}:${ref.mentioned_in.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private suggestFileAlternatives(missingPath: string, basePath: string): string {
    try {
      const dirPath = path.dirname(path.resolve(basePath, missingPath));
      const files = fs.readdirSync(dirPath);
      const fileName = path.basename(missingPath);
      
      // Find similar files
      const similar = files.filter(file => 
        file.toLowerCase().includes(fileName.toLowerCase()) ||
        fileName.toLowerCase().includes(file.toLowerCase())
      );

      if (similar.length > 0) {
        return `Did you mean: ${similar.slice(0, 3).join(', ')}?`;
      }
    } catch {
      // Directory doesn't exist
    }
    return 'Check if the file path is correct and the file exists.';
  }

  private suggestDirectoryAlternatives(missingPath: string, basePath: string): string {
    try {
      const parentDir = path.dirname(path.resolve(basePath, missingPath));
      const dirs = fs.readdirSync(parentDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      const dirName = path.basename(missingPath);
      const similar = dirs.filter(dir => 
        dir.toLowerCase().includes(dirName.toLowerCase()) ||
        dirName.toLowerCase().includes(dir.toLowerCase())
      );

      if (similar.length > 0) {
        return `Did you mean: ${similar.slice(0, 3).join(', ')}?`;
      }
    } catch {
      // Parent directory doesn't exist
    }
    return 'Check if the directory path is correct and the directory exists.';
  }

  private inferDirectoryFromTree(treeLines: string[]): string | null {
    // Look for common root patterns
    for (const line of treeLines) {
      if (line.includes('src/') || line.includes('├── src')) return '.';
      if (line.includes('project/')) return '.';
    }
    return '.'; // Default to current directory
  }

  private getActualDirectoryStructure(dirPath: string): string[] {
    const files: string[] = [];
    
    function traverse(currentPath: string, relativePath: string = '') {
      try {
        const items = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const item of items) {
          const itemPath = relativePath ? `${relativePath}/${item.name}` : item.name;
          if (item.isFile()) {
            files.push(itemPath);
          } else if (item.isDirectory() && !item.name.startsWith('.')) {
            traverse(path.join(currentPath, item.name), itemPath);
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    const fullPath = path.resolve(this.basePath, dirPath);
    traverse(fullPath);
    return files;
  }

  private extractFilesFromTreeStructure(treeLines: string[]): string[] {
    const files: string[] = [];
    let currentDirectory = '';
    
    for (const line of treeLines) {
      // Extract the item name from tree structure lines
      const itemMatch = line.match(/.*[├└]──\s*(.+)/);
      if (!itemMatch) continue;
      
      const item = itemMatch[1].trim();
      if (!item) continue;
      
      // Count the level of indentation to understand nesting
      const indentLevel = (line.match(/│/g) || []).length;
      
      // Determine if this is a directory or file
      const isDirectory = item.endsWith('/');
      const cleanItem = isDirectory ? item.slice(0, -1) : item;
      
      if (isDirectory) {
        // This is a directory - update our current directory context
        if (indentLevel === 0) {
          // Root level directory
          currentDirectory = cleanItem;
        } else {
          // Nested directory (we'll keep it simple for now)
          currentDirectory = cleanItem;
        }
      } else {
        // This is a file
        if (cleanItem.includes('.') && !cleanItem.includes('#')) {
          if (indentLevel > 0 && currentDirectory) {
            // File is nested in a directory
            files.push(`${currentDirectory}/${cleanItem}`);
          } else {
            // File is at root level
            files.push(cleanItem);
          }
        }
      }
    }
    
    return files;
  }
}
