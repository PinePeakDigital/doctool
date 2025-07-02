import * as fs from 'fs';
import * as path from 'path';
import { DocumentationIssue, DocumentationAnalysis } from './documentationIssues';
import { parseMarkdownSections, ContentSection } from './diffUtils';

export interface FixResult {
  issue: DocumentationIssue;
  applied: boolean;
  reason?: string;
  changes?: string;
}

export interface FixSummary {
  filePath: string;
  totalIssues: number;
  fixesApplied: number;
  fixesSkipped: number;
  results: FixResult[];
}

/**
 * Applies targeted fixes to documentation issues
 */
export function applyDocumentationFixes(
  analysis: DocumentationAnalysis,
  options: { 
    dryRun?: boolean; 
    severityThreshold?: 'low' | 'medium' | 'high';
    autoApprove?: boolean;
  } = {}
): FixSummary {
  const { dryRun = false, severityThreshold = 'medium', autoApprove = true } = options;
  
  // Read current content
  let content = '';
  try {
    content = fs.readFileSync(analysis.filePath, 'utf8');
  } catch (error) {
    content = '';
  }
  
  const results: FixResult[] = [];
  let modifiedContent = content;
  
  // Filter issues by severity threshold
  const severityLevels = { low: 0, medium: 1, high: 2 };
  const threshold = severityLevels[severityThreshold];
  const issuesToFix = analysis.issues.filter(issue => 
    severityLevels[issue.severity] >= threshold
  );
  
  // Apply fixes in order of severity (high -> medium -> low)
  const sortedIssues = issuesToFix.sort((a, b) => 
    severityLevels[b.severity] - severityLevels[a.severity]
  );
  
  for (const issue of sortedIssues) {
    const result = applyIssuseFix(issue, modifiedContent, { dryRun, autoApprove });
    results.push(result);
    
    if (result.applied && result.changes) {
      modifiedContent = result.changes;
    }
  }
  
  // Write back the modified content
  if (!dryRun && modifiedContent !== content) {
    try {
      fs.writeFileSync(analysis.filePath, modifiedContent, 'utf8');
    } catch (error) {
      console.error(`Failed to write fixes to ${analysis.filePath}:`, error);
    }
  }
  
  const fixesApplied = results.filter(r => r.applied).length;
  const fixesSkipped = results.filter(r => !r.applied).length;
  
  return {
    filePath: analysis.filePath,
    totalIssues: analysis.issues.length,
    fixesApplied,
    fixesSkipped,
    results
  };
}

/**
 * Applies a single issue fix
 */
function applyIssuseFix(
  issue: DocumentationIssue,
  content: string,
  options: { dryRun?: boolean; autoApprove?: boolean }
): FixResult {
  const { dryRun = false, autoApprove = true } = options;
  
  if (!autoApprove) {
    // In interactive mode, would prompt user here
    // For now, we'll auto-approve all fixes
  }
  
  try {
    let modifiedContent = content;
    
    switch (issue.suggestedFix.action) {
      case 'add_files':
        modifiedContent = addFileToDocumentation(content, issue);
        break;
      case 'add_section':
        modifiedContent = addMissingSection(content, issue);
        break;
      case 'update_content':
        modifiedContent = updateFileDescription(content, issue);
        break;
      case 'remove_placeholder':
        modifiedContent = removePlaceholderContent(content, issue);
        break;
      default:
        return {
          issue,
          applied: false,
          reason: `Unknown fix action: ${issue.suggestedFix.action}`
        };
    }
    
    if (modifiedContent === content) {
      return {
        issue,
        applied: false,
        reason: 'No changes would be made'
      };
    }
    
    return {
      issue,
      applied: true,
      changes: modifiedContent
    };
    
  } catch (error) {
    return {
      issue,
      applied: false,
      reason: `Error applying fix: ${error}`
    };
  }
}

/**
 * Adds a missing file to the documentation
 */
function addFileToDocumentation(content: string, issue: DocumentationIssue): string {
  const fileName = issue.suggestedFix.target!;
  const description = issue.suggestedFix.content!;
  
  // Find the Files section
  const lines = content.split('\n');
  let filesSectionIndex = -1;
  let insertIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for "### Files" section
    if (line.trim() === '### Files') {
      filesSectionIndex = i;
      continue;
    }
    
    // If we're in the files section, find where to insert
    if (filesSectionIndex !== -1 && insertIndex === -1) {
      // Look for the end of the files list
      if (line.trim() === '' || line.startsWith('### ') || line.startsWith('## ')) {
        insertIndex = i;
        break;
      }
      
      // Insert alphabetically
      if (line.startsWith('- `') && line > `- \`${fileName}\``) {
        insertIndex = i;
        break;
      }
    }
  }
  
  // If we found the files section but no insert point, append to the end of the section
  if (filesSectionIndex !== -1 && insertIndex === -1) {
    insertIndex = lines.length;
  }
  
  // If we couldn't find a files section, find the Contents section and add one
  if (filesSectionIndex === -1) {
    const contentsIndex = lines.findIndex(line => line.trim() === '## Contents');
    if (contentsIndex !== -1) {
      const filesToAdd = [
        '',
        '### Files',
        `- \`${fileName}\` - ${description}`,
        ''
      ];
      lines.splice(contentsIndex + 1, 0, ...filesToAdd);
      return lines.join('\n');
    }
  }
  
  // Add the file to the list
  if (insertIndex !== -1) {
    lines.splice(insertIndex, 0, `- \`${fileName}\` - ${description}`);
  }
  
  return lines.join('\n');
}

/**
 * Adds a missing section to the documentation
 */
function addMissingSection(content: string, issue: DocumentationIssue): string {
  const sectionContent = issue.suggestedFix.content!;
  const sectionName = issue.suggestedFix.target!;
  
  const lines = content.split('\n');
  
  // Find the best place to insert the section
  let insertIndex = -1;
  
  // Standard section order
  const sectionOrder = ['Overview', 'Contents', 'Purpose', 'Key Components', 'Dependencies', 'Notes'];
  const sectionIndex = sectionOrder.indexOf(sectionName);
  
  if (sectionIndex !== -1) {
    // Try to insert in the correct order
    for (let i = sectionIndex + 1; i < sectionOrder.length; i++) {
      const nextSection = sectionOrder[i];
      const nextSectionIndex = lines.findIndex(line => 
        line.trim() === `## ${nextSection}`
      );
      
      if (nextSectionIndex !== -1) {
        insertIndex = nextSectionIndex;
        break;
      }
    }
  }
  
  // If we couldn't find a good spot, append before the footer
  if (insertIndex === -1) {
    const footerIndex = lines.findIndex(line => line.trim() === '---');
    insertIndex = footerIndex !== -1 ? footerIndex : lines.length;
  }
  
  // Insert the section
  const sectionLines = sectionContent.split('\n');
  lines.splice(insertIndex, 0, '', ...sectionLines);
  
  return lines.join('\n');
}

/**
 * Updates a file description with better content
 */
function updateFileDescription(content: string, issue: DocumentationIssue): string {
  const fileName = issue.suggestedFix.target!;
  const newDescription = issue.suggestedFix.content!;
  
  const lines = content.split('\n');
  
  // Find the line with the file description
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes(`\`${fileName}\``)) {
      // Replace the description part after the filename
      const match = line.match(/^(- `[^`]+` - ).+$/);
      if (match) {
        lines[i] = match[1] + newDescription;
        break;
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Removes placeholder content and replaces with better content
 */
function removePlaceholderContent(content: string, issue: DocumentationIssue): string {
  const placeholder = issue.suggestedFix.target!;
  
  // For now, just remove the placeholder
  // In a more sophisticated version, we'd replace with meaningful content
  let modifiedContent = content;
  
  if (placeholder.startsWith('[') && placeholder.includes('description')) {
    // Remove placeholder descriptions
    modifiedContent = content.replace(placeholder, 'Content to be documented');
  } else {
    // Remove references to deleted files
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => !line.includes(placeholder));
    modifiedContent = filteredLines.join('\n');
  }
  
  return modifiedContent;
}

/**
 * Creates a summary report of all fixes applied
 */
export function createFixReport(fixSummaries: FixSummary[]): string {
  const totalFiles = fixSummaries.length;
  const totalIssues = fixSummaries.reduce((sum, s) => sum + s.totalIssues, 0);
  const totalFixes = fixSummaries.reduce((sum, s) => sum + s.fixesApplied, 0);
  const totalSkipped = fixSummaries.reduce((sum, s) => sum + s.fixesSkipped, 0);
  
  let report = `📊 Documentation Fix Report\n`;
  report += `${'='.repeat(40)}\n\n`;
  report += `Files processed: ${totalFiles}\n`;
  report += `Total issues found: ${totalIssues}\n`;
  report += `Fixes applied: ${totalFixes}\n`;
  report += `Fixes skipped: ${totalSkipped}\n\n`;
  
  for (const summary of fixSummaries) {
    if (summary.fixesApplied > 0 || summary.fixesSkipped > 0) {
      report += `📄 ${path.basename(summary.filePath)}\n`;
      
      for (const result of summary.results) {
        const status = result.applied ? '✅' : '⏭️ ';
        const reason = result.reason ? ` (${result.reason})` : '';
        report += `   ${status} ${result.issue.description}${reason}\n`;
      }
      report += `\n`;
    }
  }
  
  return report;
}
