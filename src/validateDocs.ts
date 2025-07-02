#!/usr/bin/env tsx

import * as path from 'path';
import * as fs from 'fs';
import { FileSystemValidator } from './utils/fileSystemValidator';
import { LinkValidator } from './utils/linkValidator';

async function main() {
  console.log('🔍 DocTool Documentation Validator');
  console.log('=====================================\n');

  const basePath = process.cwd();
  const fileValidator = new FileSystemValidator(basePath);
  const linkValidator = new LinkValidator(basePath);

  // Find all knowledge/documentation files
  const docFiles = findDocumentationFiles(basePath);
  
  console.log(`Found ${docFiles.length} documentation files to validate:\n`);

  let totalIssues = 0;
  let criticalIssues = 0;

  for (const docFile of docFiles) {
    console.log(`📝 Validating: ${path.relative(basePath, docFile)}`);
    
    try {
      // Run both file system and link validation
      const fileIssues = fileValidator.validateDocumentationFile(docFile);
      const linkIssues = await linkValidator.validateDocumentationFile(docFile);
      
      const allIssues = [...fileIssues, ...linkIssues];
      
      if (allIssues.length === 0) {
        console.log('   ✅ No issues found\n');
      } else {
        console.log(`   ⚠️  Found ${allIssues.length} issue(s):\n`);
        
        allIssues.forEach((issue, index) => {
          const severity = getSeverityIcon(issue.severity);
          console.log(`   ${index + 1}. ${severity} ${issue.message}`);
          console.log(`      Location: Line ${issue.location.line}`);
          console.log(`      Context: "${issue.location.context}"`);
          if (issue.suggestion) {
            console.log(`      Suggestion: ${issue.suggestion}`);
          }
          console.log('');
        });

        totalIssues += allIssues.length;
        criticalIssues += allIssues.filter(i => i.severity === 'error').length;
      }
    } catch (error) {
      console.log(`   ❌ Error validating file: ${error}\n`);
    }
  }

  // Summary
  console.log('📊 Validation Summary');
  console.log('=====================');
  console.log(`Files validated: ${docFiles.length}`);
  console.log(`Total issues: ${totalIssues}`);
  console.log(`Critical issues: ${criticalIssues}`);
  console.log(`Warnings: ${totalIssues - criticalIssues}`);

  if (totalIssues === 0) {
    console.log('\n🎉 All documentation files are valid!');
  } else if (criticalIssues === 0) {
    console.log('\n✨ No critical issues found, but some improvements are suggested.');
  } else {
    console.log(`\n🚨 ${criticalIssues} critical issues need attention.`);
  }
}

function findDocumentationFiles(basePath: string): string[] {
  const files: string[] = [];
  
  function scanDirectory(dirPath: string) {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isFile() && isDocumentationFile(item.name)) {
          files.push(fullPath);
        } else if (item.isDirectory() && !shouldSkipDirectory(item.name)) {
          scanDirectory(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  scanDirectory(basePath);
  return files.sort();
}

function isDocumentationFile(fileName: string): boolean {
  const docExtensions = ['.md', '.markdown', '.txt'];
  const docNames = ['README', 'CHANGELOG', 'LICENSE', 'CONTRIBUTING'];
  
  const ext = path.extname(fileName).toLowerCase();
  const nameWithoutExt = path.basename(fileName, ext).toUpperCase();
  
  return docExtensions.includes(ext) || 
         docNames.includes(nameWithoutExt) ||
         fileName.toLowerCase().includes('knowledge') ||
         fileName.toLowerCase().includes('documentation') ||
         fileName.toLowerCase().includes('guide');
}

function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = [
    'node_modules', '.git', '.vscode', '.idea', 
    'dist', 'build', 'coverage', '.nyc_output',
    '.next', '.nuxt', 'out', 'temp', 'tmp', '.cache'
  ];
  return skipDirs.includes(dirName) || dirName.startsWith('.');
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error': return '🚨';
    case 'warning': return '⚠️ ';
    case 'info': return 'ℹ️ ';
    default: return '❓';
  }
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
