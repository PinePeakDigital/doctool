import * as fs from 'fs';
import * as path from 'path';

interface DirectoryAnalysis {
  name: string;
  path: string;
  files: string[];
  subdirectories: string[];
  codeFiles: string[];
  currentKnowledgeContent?: string;
  projectContext?: string;
}

interface AIProvider {
  name: string;
  generateContent(prompt: string): Promise<string>;
}

// Simple interface for different AI providers
class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  
  async generateContent(prompt: string): Promise<string> {
    // In a real implementation, this would call OpenAI API
    // For now, we'll simulate with a detailed analysis
    return this.simulateAIResponse(prompt);
  }

  private simulateAIResponse(prompt: string): string {
    // This is a fallback that does intelligent content generation
    // based on the code analysis in the prompt
    const lines = prompt.split('\n');
    const directoryName = this.extractDirectoryName(prompt);
    const files = this.extractFiles(prompt);
    const codeContent = this.extractCodeContent(prompt);
    
    return this.generateContentFromAnalysis(directoryName, files, codeContent);
  }

  private extractDirectoryName(prompt: string): string {
    const match = prompt.match(/\*\*Directory:\*\* (.+)/);
    return match ? match[1] : 'Unknown Directory';
  }

  private extractFiles(prompt: string): string[] {
    const files: string[] = [];
    const lines = prompt.split('\n');
    let inFilesSection = false;
    
    for (const line of lines) {
      if (line.includes('**Files in directory:**')) {
        inFilesSection = true;
        continue;
      }
      if (inFilesSection && line.startsWith('- ')) {
        files.push(line.substring(2));
      } else if (inFilesSection && line.trim() === '') {
        break;
      }
    }
    
    return files;
  }

  private extractCodeContent(prompt: string): Record<string, string> {
    const codeContent: Record<string, string> = {};
    const codeBlockRegex = /### (.+?)\n```typescript\n([\s\S]*?)\n```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(prompt)) !== null) {
      codeContent[match[1]] = match[2];
    }
    
    return codeContent;
  }

  private generateContentFromAnalysis(directoryName: string, files: string[], codeContent: Record<string, string>): string {
    const isTestDirectory = directoryName.includes('test') || files.some(f => f.includes('.test.') || f.includes('.spec.'));
    const isUtilsDirectory = directoryName.includes('utils') || directoryName.includes('lib') || directoryName.startsWith('utils-');
    const isAgentsDirectory = directoryName.includes('agents') || directoryName.includes('agent');
    
    let overview = '';
    let purpose = '';
    let keyComponents = '';
    
    if (isTestDirectory) {
      overview = `The ${directoryName} directory contains test files and testing utilities that ensure code quality and reliability.`;
      purpose = `This directory maintains the testing infrastructure for the project, providing comprehensive test coverage and validation of functionality.`;
    } else if (isUtilsDirectory) {
      overview = `The ${directoryName} directory contains utility functions and helper modules that provide common functionality across the application.`;
      purpose = `This directory serves as a centralized location for reusable code, helper functions, and shared utilities that support the main application logic.`;
    } else if (isAgentsDirectory) {
      overview = `The ${directoryName} directory contains AI agent configurations and related functionality for automated task execution.`;
      purpose = `This directory implements AI-powered automation capabilities, defining agents that can perform specific tasks and workflows.`;
    } else {
      overview = `The ${directoryName} directory contains core functionality and implementation files for the application.`;
      purpose = `This directory plays a key role in the overall project architecture, implementing essential features and business logic.`;
    }

    // Analyze code content to generate better descriptions
    const fileDescriptions = this.generateFileDescriptions(files, codeContent);
    const dependencies = this.analyzeDependencies(codeContent);

    const content = `# ${directoryName}

## Overview

${overview}

## Contents

### Files
${fileDescriptions}

### Subdirectories
${files.filter(f => f.endsWith('/')).length > 0 ? 
  files.filter(f => f.endsWith('/')).map(dir => `- \`${dir}\` - Subdirectory containing related functionality`).join('\n') :
  '- No subdirectories'
}

## Purpose

${purpose}

## Key Components

${keyComponents || this.generateKeyComponents(codeContent)}

## Dependencies

${dependencies}

## Notes

${this.generateNotes(directoryName, files, codeContent)}`;

    return content;
  }

  private generateFileDescriptions(files: string[], codeContent: Record<string, string>): string {
    return files.map(file => {
      if (codeContent[file]) {
        const content = codeContent[file];
        const description = this.analyzeFileContent(file, content);
        return `- \`${file}\` - ${description}`;
      } else {
        const extension = path.extname(file);
        let description = 'File containing application logic';
        
        if (file.includes('.test.') || file.includes('.spec.')) {
          description = 'Test file containing unit tests and validation logic';
        } else if (extension === '.ts' || extension === '.js') {
          description = 'TypeScript/JavaScript module';
        } else if (extension === '.md') {
          description = 'Documentation file';
        } else if (extension === '.json') {
          description = 'Configuration or data file';
        }
        
        return `- \`${file}\` - ${description}`;
      }
    }).join('\n');
  }

  private analyzeFileContent(fileName: string, content: string): string {
    const exports = this.extractExports(content);
    const functions = this.extractFunctions(content);
    const classes = this.extractClasses(content);
    const interfaces = this.extractInterfaces(content);

    let description = '';

    if (fileName.includes('.test.') || fileName.includes('.spec.')) {
      const testCount = (content.match(/it\(|test\(/g) || []).length;
      description = `Test suite with ${testCount} test cases covering functionality`;
    } else if (classes.length > 0) {
      description = `Contains ${classes.join(', ')} class${classes.length > 1 ? 'es' : ''} providing core functionality`;
    } else if (interfaces.length > 0) {
      description = `Defines ${interfaces.join(', ')} interface${interfaces.length > 1 ? 's' : ''} for type safety`;
    } else if (functions.length > 0) {
      description = `Utility functions including ${functions.slice(0, 3).join(', ')}${functions.length > 3 ? ' and more' : ''}`;
    } else if (exports.length > 0) {
      description = `Exports ${exports.slice(0, 3).join(', ')}${exports.length > 3 ? ' and more' : ''}`;
    } else {
      description = 'Core application module';
    }

    return description;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:const|function|class|interface)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  private extractFunctions(content: string): string[] {
    const functions: string[] = [];
    const functionRegex = /(?:export\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1] || match[2]);
    }
    
    return functions;
  }

  private extractClasses(content: string): string[] {
    const classes: string[] = [];
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }

  private extractInterfaces(content: string): string[] {
    const interfaces: string[] = [];
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push(match[1]);
    }
    
    return interfaces;
  }

  private analyzeDependencies(codeContent: Record<string, string>): string {
    const allImports = new Set<string>();
    
    for (const content of Object.values(codeContent)) {
      const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (!importPath.startsWith('.')) {
          allImports.add(importPath);
        }
      }
    }

    if (allImports.size === 0) {
      return '- No external dependencies detected';
    }

    return Array.from(allImports)
      .map(dep => `- **${dep}**: External dependency`)
      .join('\n');
  }

  private generateKeyComponents(codeContent: Record<string, string>): string {
    const components: string[] = [];
    
    for (const [fileName, content] of Object.entries(codeContent)) {
      const exports = this.extractExports(content);
      const classes = this.extractClasses(content);
      const functions = this.extractFunctions(content);
      
      if (classes.length > 0 || functions.length > 0 || exports.length > 0) {
        components.push(`**${fileName}**: ${this.analyzeFileContent(fileName, content)}`);
      }
    }

    return components.length > 0 ? components.join('\n\n') : 'Core functionality implemented in this directory';
  }

  private generateNotes(directoryName: string, files: string[], codeContent: Record<string, string>): string {
    const notes: string[] = [];
    
    if (files.some(f => f.includes('.test.'))) {
      notes.push('- Contains comprehensive test coverage');
    }
    
    if (Object.keys(codeContent).some(f => f.includes('index.'))) {
      notes.push('- Includes index file for clean imports');
    }
    
    if (files.some(f => f.endsWith('.md'))) {
      notes.push('- Includes documentation files');
    }

    return notes.length > 0 ? notes.join('\n') : '- Well-structured directory following project conventions';
  }
}

/**
 * Analyzes a directory and gathers information needed for content generation
 */
export function analyzeDirectoryForContent(dirPath: string): DirectoryAnalysis {
  const dirName = path.basename(dirPath);
  const files: string[] = [];
  const subdirectories: string[] = [];
  const codeFiles: string[] = [];
  
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isFile()) {
        files.push(item.name);
        // Track code files for analysis
        if (item.name.match(/\.(ts|js|tsx|jsx)$/)) {
          codeFiles.push(item.name);
        }
      } else if (item.isDirectory() && !item.name.startsWith('.')) {
        subdirectories.push(item.name);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error);
  }

  // Check for existing knowledge file
  let currentKnowledgeContent: string | undefined;
  const knowledgeFiles = ['KNOWLEDGE.md', 'knowledge.md', 'README.md'];
  
  for (const fileName of knowledgeFiles) {
    const filePath = path.join(dirPath, fileName);
    if (fs.existsSync(filePath)) {
      try {
        currentKnowledgeContent = fs.readFileSync(filePath, 'utf8');
        break;
      } catch (error) {
        console.warn(`Warning: Could not read knowledge file ${filePath}:`, error);
      }
    }
  }

  return {
    name: dirName,
    path: dirPath,
    files,
    subdirectories,
    codeFiles,
    currentKnowledgeContent
  };
}

/**
 * Reads code files from a directory for analysis
 */
export function getCodeContent(dirPath: string, codeFiles: string[]): Record<string, string> {
  const codeContent: Record<string, string> = {};
  
  for (const fileName of codeFiles) {
    try {
      const filePath = path.join(dirPath, fileName);
      const content = fs.readFileSync(filePath, 'utf8');
      codeContent[fileName] = content;
    } catch (error) {
      console.warn(`Warning: Could not read code file ${fileName}:`, error);
    }
  }
  
  return codeContent;
}

/**
 * Creates a prompt for AI content generation
 */
export function createContentGenerationPrompt(analysis: DirectoryAnalysis, codeContent: Record<string, string>): string {
  let prompt = `Analyze the following directory and generate comprehensive knowledge file content:\n\n`;
  
  prompt += `**Directory:** ${analysis.name}\n`;
  prompt += `**Path:** ${analysis.path}\n\n`;
  
  prompt += `**Files in directory:**\n`;
  analysis.files.forEach(file => {
    prompt += `- ${file}\n`;
  });
  
  if (analysis.subdirectories.length > 0) {
    prompt += `\n**Subdirectories:**\n`;
    analysis.subdirectories.forEach(dir => {
      prompt += `- ${dir}/\n`;
    });
  }
  
  if (Object.keys(codeContent).length > 0) {
    prompt += `\n**Code Analysis:**\n`;
    for (const [fileName, content] of Object.entries(codeContent)) {
      prompt += `\n### ${fileName}\n`;
      prompt += `\`\`\`typescript\n${content}\n\`\`\`\n`;
    }
  }
  
  if (analysis.currentKnowledgeContent) {
    prompt += `\n**Current knowledge file content:**\n`;
    prompt += `\`\`\`markdown\n${analysis.currentKnowledgeContent}\n\`\`\`\n`;
    prompt += `\nPlease enhance and improve this existing content while maintaining any valuable information.\n`;
  } else {
    prompt += `\nNo existing knowledge file found. Please create comprehensive content from scratch.\n`;
  }
  
  prompt += `\nGenerate detailed, accurate knowledge file content following the standard template. Focus on being helpful to developers who need to understand and work with this code.`;
  
  return prompt;
}

/**
 * Generates enhanced knowledge file content for a directory using AI
 */
export async function generateKnowledgeContent(dirPath: string, provider?: AIProvider): Promise<string | null> {
  try {
    console.log(`\n📝 Analyzing directory: ${dirPath}`);
    
    // Analyze the directory
    const analysis = analyzeDirectoryForContent(dirPath);
    
    // Get code content for analysis
    const codeContent = getCodeContent(dirPath, analysis.codeFiles);
    
    // Create prompt for the AI
    const prompt = createContentGenerationPrompt(analysis, codeContent);
    
    console.log(`🤖 Generating content with AI...`);
    
    // Use the provided AI provider or default to OpenAI simulation
    const aiProvider = provider || new OpenAIProvider();
    const result = await aiProvider.generateContent(prompt);
    
    return result;
  } catch (error) {
    console.error(`Error generating content for ${dirPath}:`, error);
    return null;
  }
}

/**
 * Updates a knowledge file with new content
 */
export function updateKnowledgeFile(dirPath: string, content: string): boolean {
  try {
    const knowledgeFilePath = path.join(dirPath, 'knowledge.md');
    
    // Add timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const contentWithTimestamp = content + `\n\n---\n\n*Last updated: ${timestamp}*\n*Content generated with AI assistance*`;
    
    fs.writeFileSync(knowledgeFilePath, contentWithTimestamp, 'utf8');
    console.log(`✅ Updated knowledge file: ${knowledgeFilePath}`);
    return true;
  } catch (error) {
    console.error(`Error updating knowledge file for ${dirPath}:`, error);
    return false;
  }
}

/**
 * Checks if a knowledge file needs AI enhancement (contains template placeholders)
 */
export function needsAIEnhancement(knowledgeContent: string): boolean {
  const templateIndicators = [
    '[brief description of the directory\'s purpose]',
    '[description]',
    '[Describe the role this directory plays',
    '[List and describe important files',
    '[List any dependencies or relationships',
    '[Any additional notes, warnings',
    'This file was generated automatically and should be updated'
  ];
  
  return templateIndicators.some(indicator => knowledgeContent.includes(indicator));
}

/**
 * Main function to enhance all knowledge files in a project with AI-generated content
 */
export async function enhanceKnowledgeFiles(basePath: string = process.cwd()): Promise<void> {
  console.log(`🚀 Starting AI enhancement of knowledge files in: ${basePath}`);
  
  const knowledgeFiles = findKnowledgeFiles(basePath);
  let enhancedCount = 0;
  let skippedCount = 0;
  
  for (const filePath of knowledgeFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (needsAIEnhancement(content)) {
        const dirPath = path.dirname(filePath);
        console.log(`\n🔄 Enhancing: ${filePath}`);
        
        const enhancedContent = await generateKnowledgeContent(dirPath);
        
        if (enhancedContent) {
          updateKnowledgeFile(dirPath, enhancedContent);
          enhancedCount++;
        } else {
          console.log(`⚠️  Failed to generate content for: ${filePath}`);
        }
      } else {
        console.log(`✅ Already enhanced: ${filePath}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }
  
  console.log(`\n📊 Enhancement Summary:`);
  console.log(`- Knowledge files enhanced: ${enhancedCount}`);
  console.log(`- Files skipped (already enhanced): ${skippedCount}`);
  console.log(`- Total knowledge files: ${knowledgeFiles.length}`);
}

/**
 * Finds all knowledge files in a directory tree
 */
function findKnowledgeFiles(basePath: string): string[] {
  const knowledgeFiles: string[] = [];
  const excludedDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);
  
  function scanRecursively(currentPath: string) {
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory() && !excludedDirs.has(item.name) && !item.name.startsWith('.')) {
          scanRecursively(path.join(currentPath, item.name));
        } else if (item.isFile() && (item.name === 'knowledge.md' || item.name === 'KNOWLEDGE.md')) {
          knowledgeFiles.push(path.join(currentPath, item.name));
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentPath}:`, error);
    }
  }
  
  scanRecursively(basePath);
  return knowledgeFiles;
}
