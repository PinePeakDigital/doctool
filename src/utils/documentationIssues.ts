import * as fs from "fs";
import * as path from "path";
import { getChangesSinceDate, getLastUpdateTimestamp } from "./gitUtils.js";
import { parseMarkdownSections, ContentSection } from "./diffUtils.js";

export interface DocumentationIssue {
  type:
    | "missing_files"
    | "outdated_descriptions"
    | "missing_sections"
    | "placeholder_content"
    | "inconsistent_structure";
  severity: "low" | "medium" | "high";
  description: string;
  location?: {
    section?: string;
    line?: number;
  };
  suggestedFix: {
    action:
      | "add_section"
      | "update_content"
      | "add_files"
      | "remove_placeholder";
    content?: string;
    target?: string;
  };
}

export interface DocumentationAnalysis {
  filePath: string;
  issues: DocumentationIssue[];
  overallHealth: "good" | "needs_attention" | "poor";
  lastUpdated?: Date;
  filesAnalyzed: string[];
  directoryChanges: {
    newFiles: string[];
    modifiedFiles: string[];
    deletedFiles: string[];
  };
}

/**
 * Analyzes a knowledge file for specific issues
 */
export function analyzeDocumentationIssues(
  knowledgeFilePath: string,
  basePath: string,
): DocumentationAnalysis {
  const issues: DocumentationIssue[] = [];
  const dirPath = path.dirname(knowledgeFilePath);
  const lastUpdate = getLastUpdateTimestamp(knowledgeFilePath);

  // Get current files in directory
  const currentFiles = getCurrentDirectoryFiles(dirPath);

  // Get changes since last update
  const checkDate =
    lastUpdate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const changes = getChangesSinceDate(basePath, checkDate);

  // Filter changes relevant to this directory
  const relativeDirPath = path.relative(basePath, dirPath);
  const directoryChanges = {
    newFiles: changes.newFiles.filter((f) => f.startsWith(relativeDirPath)),
    modifiedFiles: changes.modifiedFiles.filter((f) =>
      f.startsWith(relativeDirPath),
    ),
    deletedFiles: changes.deletedFiles.filter((f) =>
      f.startsWith(relativeDirPath),
    ),
  };

  // Read and parse existing knowledge file
  let content = "";
  let sections: ContentSection[] = [];

  try {
    content = fs.readFileSync(knowledgeFilePath, "utf8");
    sections = parseMarkdownSections(content);
  } catch {
    issues.push({
      type: "missing_sections",
      severity: "high",
      description: "Knowledge file is missing or unreadable",
      suggestedFix: {
        action: "add_section",
        content: generateBasicTemplate(path.basename(dirPath)),
      },
    });
  }

  // Issue 1: Check for template placeholders
  const placeholderIssues = detectPlaceholderContent(content);
  issues.push(...placeholderIssues);

  // Issue 2: Check for missing new files in file listings
  const missingFileIssues = detectMissingFiles(
    content,
    currentFiles,
    directoryChanges.newFiles,
  );
  issues.push(...missingFileIssues);

  // Issue 3: Check for outdated file descriptions
  const outdatedDescriptionIssues = detectOutdatedDescriptions(
    content,
    currentFiles,
    dirPath,
  );
  issues.push(...outdatedDescriptionIssues);

  // Issue 4: Check for missing standard sections
  const missingSectionIssues = detectMissingSections(sections);
  issues.push(...missingSectionIssues);

  // Issue 5: Check for deleted files still mentioned
  const deletedFileIssues = detectDeletedFileReferences(
    content,
    directoryChanges.deletedFiles,
  );
  issues.push(...deletedFileIssues);

  // Determine overall health
  const highIssues = issues.filter((i) => i.severity === "high").length;
  const mediumIssues = issues.filter((i) => i.severity === "medium").length;

  let overallHealth: "good" | "needs_attention" | "poor";
  if (highIssues > 0 || mediumIssues > 3) {
    overallHealth = "poor";
  } else if (mediumIssues > 0 || issues.length > 2) {
    overallHealth = "needs_attention";
  } else {
    overallHealth = "good";
  }

  return {
    filePath: knowledgeFilePath,
    issues,
    overallHealth,
    lastUpdated: lastUpdate || undefined,
    filesAnalyzed: currentFiles,
    directoryChanges,
  };
}

/**
 * Detects template placeholder content that needs to be replaced
 */
function detectPlaceholderContent(content: string): DocumentationIssue[] {
  const issues: DocumentationIssue[] = [];

  const placeholders = [
    {
      text: "[brief description of the directory's purpose]",
      section: "Overview",
    },
    { text: "[description]", section: "Files" },
    { text: "[Describe the role this directory plays", section: "Purpose" },
    { text: "[List and describe important files", section: "Key Components" },
    {
      text: "[List any dependencies or relationships",
      section: "Dependencies",
    },
    { text: "[Any additional notes, warnings", section: "Notes" },
  ];

  for (const placeholder of placeholders) {
    if (content.includes(placeholder.text)) {
      issues.push({
        type: "placeholder_content",
        severity: "medium",
        description: `Placeholder content found in ${placeholder.section} section`,
        location: { section: placeholder.section },
        suggestedFix: {
          action: "remove_placeholder",
          target: placeholder.text,
        },
      });
    }
  }

  return issues;
}

/**
 * Detects missing files in the documentation
 */
function detectMissingFiles(
  content: string,
  currentFiles: string[],
  newFiles: string[],
): DocumentationIssue[] {
  const issues: DocumentationIssue[] = [];

  // Check for new files not mentioned in documentation
  for (const newFile of newFiles) {
    const fileName = path.basename(newFile);
    if (!content.includes(fileName) && isSignificantFile(fileName)) {
      issues.push({
        type: "missing_files",
        severity: "medium",
        description: `New file "${fileName}" not documented`,
        suggestedFix: {
          action: "add_files",
          content: generateFileDescription(fileName),
          target: fileName,
        },
      });
    }
  }

  // Check for significant files in directory not mentioned
  for (const file of currentFiles) {
    if (!content.includes(file) && isSignificantFile(file)) {
      issues.push({
        type: "missing_files",
        severity: "low",
        description: `File "${file}" not documented`,
        suggestedFix: {
          action: "add_files",
          content: generateFileDescription(file),
          target: file,
        },
      });
    }
  }

  return issues;
}

/**
 * Detects outdated descriptions by checking if files have changed significantly
 */
function detectOutdatedDescriptions(
  content: string,
  currentFiles: string[],
  dirPath: string,
): DocumentationIssue[] {
  const issues: DocumentationIssue[] = [];

  // For now, we'll check for generic descriptions that could be improved
  const genericDescriptions = [
    "Core application module",
    "File containing application logic",
    "TypeScript/JavaScript module",
  ];

  for (const description of genericDescriptions) {
    if (content.includes(description)) {
      // Find which file this might be describing
      const lines = content.split("\n");
      const descriptionLine = lines.find((line) => line.includes(description));

      if (descriptionLine) {
        const fileMatch = descriptionLine.match(/`([^`]+)`/);
        if (fileMatch) {
          const fileName = fileMatch[1];
          issues.push({
            type: "outdated_descriptions",
            severity: "low",
            description: `Generic description for "${fileName}" could be improved`,
            suggestedFix: {
              action: "update_content",
              content: generateBetterFileDescription(fileName, dirPath),
              target: fileName,
            },
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Detects missing standard sections
 */
function detectMissingSections(
  sections: ContentSection[],
): DocumentationIssue[] {
  const issues: DocumentationIssue[] = [];

  const requiredSections = [
    { name: "Overview", level: 2 },
    { name: "Contents", level: 2 },
    { name: "Purpose", level: 2 },
  ];

  for (const required of requiredSections) {
    const exists = sections.some(
      (s) =>
        s.heading.toLowerCase() === required.name.toLowerCase() &&
        s.level === required.level,
    );

    if (!exists) {
      issues.push({
        type: "missing_sections",
        severity: "medium",
        description: `Missing standard section: ${required.name}`,
        suggestedFix: {
          action: "add_section",
          content: generateSectionTemplate(required.name),
          target: required.name,
        },
      });
    }
  }

  return issues;
}

/**
 * Detects references to deleted files
 */
function detectDeletedFileReferences(
  content: string,
  deletedFiles: string[],
): DocumentationIssue[] {
  const issues: DocumentationIssue[] = [];

  for (const deletedFile of deletedFiles) {
    const fileName = path.basename(deletedFile);
    if (content.includes(fileName)) {
      issues.push({
        type: "missing_files",
        severity: "medium",
        description: `Reference to deleted file "${fileName}" should be removed`,
        suggestedFix: {
          action: "remove_placeholder",
          target: fileName,
        },
      });
    }
  }

  return issues;
}

/**
 * Gets current files in a directory
 */
function getCurrentDirectoryFiles(dirPath: string): string[] {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((item) => item.isFile())
      .map((item) => item.name);
  } catch {
    return [];
  }
}

/**
 * Determines if a file is significant enough to document
 */
function isSignificantFile(fileName: string): boolean {
  // Skip hidden files, lock files, and certain extensions
  if (
    fileName.startsWith(".") ||
    fileName.includes("lock") ||
    fileName === "knowledge.md"
  ) {
    return false;
  }

  const significantExtensions = [
    ".ts",
    ".js",
    ".tsx",
    ".jsx",
    ".md",
    ".json",
    ".yaml",
    ".yml",
  ];
  const extension = path.extname(fileName);

  return significantExtensions.includes(extension);
}

/**
 * Generates a basic file description
 */
function generateFileDescription(fileName: string): string {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);

  if (fileName.includes(".test.") || fileName.includes(".spec.")) {
    return `Test file for ${baseName} functionality`;
  }

  switch (ext) {
    case ".ts":
    case ".js":
      return `TypeScript/JavaScript module containing ${baseName} functionality`;
    case ".md":
      return "Documentation file";
    case ".json":
      return "Configuration file";
    case ".yaml":
    case ".yml":
      return "Configuration file";
    default:
      return `${baseName} implementation file`;
  }
}

/**
 * Generates a better file description by analyzing the actual file
 */
function generateBetterFileDescription(
  fileName: string,
  dirPath: string,
): string {
  try {
    const filePath = path.join(dirPath, fileName);
    const content = fs.readFileSync(filePath, "utf8");

    // Analyze content for exports, classes, functions
    const namedExports = (
      content.match(/export\s+(?:class|function|const|interface)\s+(\w+)/g) ||
      []
    ).length;
    const reExports = (content.match(/export\s*\{[^}]+\}/g) || []).length;
    const exports = namedExports + reExports;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const interfaces = (content.match(/interface\s+\w+/g) || []).length;
    const functions = (
      content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []
    ).length;

    if (classes > 0) {
      return `Contains ${classes} class${classes > 1 ? "es" : ""} with core functionality`;
    } else if (interfaces > 0) {
      return `Defines ${interfaces} interface${interfaces > 1 ? "s" : ""} for type safety`;
    } else if (functions > 2) {
      return `Utility module with ${functions} functions`;
    } else if (exports > 0) {
      return `Module exporting ${exports} component${exports > 1 ? "s" : ""}`;
    }

    return generateFileDescription(fileName);
  } catch {
    return generateFileDescription(fileName);
  }
}

/**
 * Generates a template for missing sections
 */
function generateSectionTemplate(sectionName: string): string {
  switch (sectionName.toLowerCase()) {
    case "overview":
      return "## Overview\n\nThis directory contains [brief description of purpose and functionality].";
    case "contents":
      return "## Contents\n\n### Files\n[File listings will be updated automatically]\n\n### Subdirectories\n[Subdirectory listings will be updated automatically]";
    case "purpose":
      return "## Purpose\n\nThis directory serves [specific role in the project architecture].";
    default:
      return `## ${sectionName}\n\n[Section content to be added]`;
  }
}

/**
 * Generates a basic knowledge file template
 */
function generateBasicTemplate(directoryName: string): string {
  return `# ${directoryName}

## Overview

This directory contains [brief description of purpose and functionality].

## Contents

### Files
[File listings will be updated automatically]

### Subdirectories
[Subdirectory listings will be updated automatically]

## Purpose

This directory serves [specific role in the project architecture].

## Notes

[Additional notes and important information]`;
}
