import * as readline from "readline";

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNumber?: number;
}

export interface FileDiff {
  filePath: string;
  oldContent: string;
  newContent: string;
  lines: DiffLine[];
  hasChanges: boolean;
}

/**
 * Generates a unified diff between two text contents
 */
export function generateDiff(
  oldContent: string,
  newContent: string,
  filePath: string = "",
): FileDiff {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const diffLines = computeDiffLines(oldLines, newLines);

  return {
    filePath,
    oldContent,
    newContent,
    lines: diffLines,
    hasChanges: diffLines.some((line) => line.type !== "context"),
  };
}

/**
 * Computes diff lines using a simple LCS algorithm
 */
function computeDiffLines(oldLines: string[], newLines: string[]): DiffLine[] {
  const diffLines: DiffLine[] = [];

  // Simple diff algorithm - for more complex diffs, we could use a library like diff
  const lcs = longestCommonSubsequence(oldLines, newLines);

  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (
      lcsIndex < lcs.length &&
      oldIndex < oldLines.length &&
      oldLines[oldIndex] === lcs[lcsIndex]
    ) {
      // Common line
      diffLines.push({
        type: "context",
        content: oldLines[oldIndex],
        lineNumber: oldIndex + 1,
      });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (
      oldIndex < oldLines.length &&
      (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])
    ) {
      // Line removed from old
      diffLines.push({
        type: "remove",
        content: oldLines[oldIndex],
        lineNumber: oldIndex + 1,
      });
      oldIndex++;
    } else if (newIndex < newLines.length) {
      // Line added in new
      diffLines.push({
        type: "add",
        content: newLines[newIndex],
      });
      newIndex++;
    }
  }

  return diffLines;
}

/**
 * Simple implementation of Longest Common Subsequence
 */
function longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Build LCS table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Reconstruct LCS
  const lcs: string[] = [];
  let i = m,
    j = n;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Formats a diff for console display
 */
export function formatDiffForConsole(
  diff: FileDiff,
  contextLines: number = 3,
): string {
  if (!diff.hasChanges) {
    return `No changes in ${diff.filePath}`;
  }

  const lines: string[] = [];
  lines.push(`\n📄 Changes in ${diff.filePath}:`);
  lines.push("─".repeat(60));

  // Group consecutive changes with context
  const groupedLines = groupDiffLines(diff.lines, contextLines);

  for (const group of groupedLines) {
    for (const line of group) {
      let prefix = " ";
      let color = "";

      switch (line.type) {
        case "add":
          prefix = "+";
          color = "\x1b[32m"; // Green
          break;
        case "remove":
          prefix = "-";
          color = "\x1b[31m"; // Red
          break;
        case "context":
          prefix = " ";
          color = "\x1b[37m"; // White
          break;
      }

      const lineNumber = line.lineNumber
        ? `${line.lineNumber}`.padStart(4)
        : "    ";
      lines.push(`${color}${prefix}${lineNumber} ${line.content}\x1b[0m`);
    }

    if (group !== groupedLines[groupedLines.length - 1]) {
      lines.push("...");
    }
  }

  return lines.join("\n");
}

/**
 * Groups diff lines with context
 */
function groupDiffLines(
  diffLines: DiffLine[],
  contextLines: number,
): DiffLine[][] {
  const groups: DiffLine[][] = [];
  let currentGroup: DiffLine[] = [];
  let contextCount = 0;

  for (let i = 0; i < diffLines.length; i++) {
    const line = diffLines[i];

    if (line.type === "context") {
      if (currentGroup.length === 0) {
        // Skip leading context if no changes yet
        continue;
      }

      contextCount++;
      if (contextCount <= contextLines) {
        currentGroup.push(line);
      } else {
        // Too much context, start new group
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          contextCount = 0;
        }
      }
    } else {
      // Change line (add/remove)
      currentGroup.push(line);
      contextCount = 0;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Prompts user for approval with interactive CLI
 */
export function promptUserApproval(
  message: string = "Apply these changes?",
): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`\n${message} (y/n/q): `, (answer) => {
      rl.close();

      const normalized = answer.toLowerCase().trim();

      if (normalized === "q" || normalized === "quit") {
        console.log("Exiting...");
        process.exit(0);
      }

      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

/**
 * Prompts user with multiple options
 */
export function promptUserChoice(
  message: string,
  choices: string[],
): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const choiceText = choices
      .map((choice, index) => `${index + 1}. ${choice}`)
      .join("\n");
    const prompt = `\n${message}\n${choiceText}\nChoice (1-${choices.length}): `;

    rl.question(prompt, (answer) => {
      rl.close();

      const choiceIndex = parseInt(answer.trim()) - 1;
      if (choiceIndex >= 0 && choiceIndex < choices.length) {
        resolve(choices[choiceIndex]);
      } else {
        console.log("Invalid choice, defaulting to first option.");
        resolve(choices[0]);
      }
    });
  });
}

/**
 * Splits content into sections based on markdown headings
 */
export interface ContentSection {
  heading: string;
  content: string;
  startLine: number;
  endLine: number;
  level: number;
}

export function parseMarkdownSections(content: string): ContentSection[] {
  const lines = content.split("\n");
  const sections: ContentSection[] = [];
  let currentSection: ContentSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Close previous section
      if (currentSection) {
        currentSection.endLine = i - 1;
        currentSection.content = lines
          .slice(currentSection.startLine, i)
          .join("\n");
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        heading: headingMatch[2],
        content: "",
        startLine: i,
        endLine: lines.length - 1,
        level: headingMatch[1].length,
      };
    }
  }

  // Close final section
  if (currentSection) {
    currentSection.content = lines.slice(currentSection.startLine).join("\n");
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Merges two sets of markdown sections intelligently
 */
export function mergeSections(
  oldSections: ContentSection[],
  newSections: ContentSection[],
): string {
  const mergedContent: string[] = [];
  const processedSections = new Set<string>();

  // First, add sections that exist in both (prioritizing new content but preserving manual additions)
  for (const newSection of newSections) {
    const oldSection = oldSections.find(
      (s) => s.heading === newSection.heading,
    );

    if (oldSection) {
      // Section exists in both - use new content but preserve any manual additions
      mergedContent.push(newSection.content);
    } else {
      // New section - add it
      mergedContent.push(newSection.content);
    }

    processedSections.add(newSection.heading);
  }

  // Add any old sections that weren't in the new content (manual additions)
  for (const oldSection of oldSections) {
    if (!processedSections.has(oldSection.heading)) {
      mergedContent.push(oldSection.content);
    }
  }

  return mergedContent.join("\n\n");
}
