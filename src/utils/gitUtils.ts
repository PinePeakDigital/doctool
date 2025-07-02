import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface GitChanges {
  newFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  lastCommitDate?: Date;
}

export interface RepositoryInfo {
  hasGit: boolean;
  lastCommitDate?: Date;
  workingDirectory: string;
}

/**
 * Checks if git is available and the directory is a git repository
 */
export function getRepositoryInfo(basePath: string): RepositoryInfo {
  try {
    // Check if git command is available
    execSync("git --version", { stdio: "ignore" });

    // Check if current directory is a git repository
    execSync("git rev-parse --git-dir", {
      cwd: basePath,
      stdio: "ignore",
    });

    // Get last commit date
    const lastCommitOutput = execSync("git log -1 --format=%ci", {
      cwd: basePath,
      encoding: "utf8",
    });

    const lastCommitDate = new Date(lastCommitOutput.trim());

    return {
      hasGit: true,
      lastCommitDate,
      workingDirectory: basePath,
    };
  } catch {
    return {
      hasGit: false,
      workingDirectory: basePath,
    };
  }
}

/**
 * Gets changes since a specific date using git
 */
export function getChangesSinceDate(
  basePath: string,
  sinceDate: Date,
): GitChanges {
  const repoInfo = getRepositoryInfo(basePath);

  if (!repoInfo.hasGit) {
    console.warn(
      "⚠️  Git not available - using file system timestamps for change detection",
    );
    return getChangesFromFileSystem(basePath, sinceDate);
  }

  try {
    const dateString = sinceDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Get files changed since the date
    const changedFilesOutput = execSync(
      `git log --since="${dateString}" --name-status --pretty=format: --diff-filter=AMR`,
      { cwd: basePath, encoding: "utf8" },
    );

    const changes: GitChanges = {
      newFiles: [],
      modifiedFiles: [],
      deletedFiles: [],
      lastCommitDate: repoInfo.lastCommitDate,
    };

    // Parse git output
    const lines = changedFilesOutput.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      const parts = line.trim().split("\t");
      if (parts.length >= 2) {
        const status = parts[0];
        const filePath = parts[1];

        // Only track relevant files (code, docs, config)
        if (isRelevantFile(filePath)) {
          switch (status) {
            case "A":
              changes.newFiles.push(filePath);
              break;
            case "M":
              changes.modifiedFiles.push(filePath);
              break;
            case "D":
              changes.deletedFiles.push(filePath);
              break;
            case "R":
              // For renames, treat as modified
              changes.modifiedFiles.push(filePath);
              break;
          }
        }
      }
    }

    return changes;
  } catch {
    console.warn(
      "⚠️  Git command failed - falling back to file system timestamps",
    );
    return getChangesFromFileSystem(basePath, sinceDate);
  }
}

/**
 * Fallback method to detect changes using file system timestamps
 */
function getChangesFromFileSystem(
  basePath: string,
  sinceDate: Date,
): GitChanges {
  const changes: GitChanges = {
    newFiles: [],
    modifiedFiles: [],
    deletedFiles: [],
  };

  function scanDirectory(dirPath: string) {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(basePath, fullPath);

        if (item.isFile() && isRelevantFile(relativePath)) {
          const stats = fs.statSync(fullPath);

          if (stats.mtime > sinceDate) {
            // File was modified since the date
            changes.modifiedFiles.push(relativePath);
          }
        } else if (item.isDirectory() && !shouldSkipDirectory(item.name)) {
          scanDirectory(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  scanDirectory(basePath);
  return changes;
}

/**
 * Checks if a file is relevant for documentation updates
 */
function isRelevantFile(filePath: string): boolean {
  const relevantExtensions = [
    ".ts",
    ".js",
    ".tsx",
    ".jsx",
    ".md",
    ".json",
    ".yaml",
    ".yml",
  ];
  const extension = path.extname(filePath).toLowerCase();

  // Skip certain directories and files
  if (shouldSkipFile(filePath)) {
    return false;
  }

  return relevantExtensions.includes(extension);
}

/**
 * Checks if a directory should be skipped
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = [
    "node_modules",
    ".git",
    ".vscode",
    ".idea",
    "dist",
    "build",
    "coverage",
    ".nyc_output",
    ".next",
    ".nuxt",
    "out",
    "temp",
    "tmp",
    ".cache",
  ];
  return skipDirs.includes(dirName) || dirName.startsWith(".");
}

/**
 * Checks if a file should be skipped
 */
function shouldSkipFile(filePath: string): boolean {
  const pathParts = filePath.split(path.sep);

  // Skip if any part of the path is a directory we should skip
  if (pathParts.some((part) => shouldSkipDirectory(part))) {
    return true;
  }

  // Skip test files from git tracking (they don't affect docs much)
  if (filePath.includes(".test.") || filePath.includes(".spec.")) {
    return true;
  }

  return false;
}

/**
 * Gets the last update timestamp from a knowledge file
 */
export function getLastUpdateTimestamp(knowledgeFilePath: string): Date | null {
  try {
    const content = fs.readFileSync(knowledgeFilePath, "utf8");

    // Look for timestamp patterns
    const timestampPattern = /\*Last updated: (\d{4}-\d{2}-\d{2})\*/;
    const match = content.match(timestampPattern);

    if (match) {
      return new Date(match[1]);
    }

    // Fallback to file modification time
    const stats = fs.statSync(knowledgeFilePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

/**
 * Checks if there are uncommitted changes in the repository
 */
export function hasUncommittedChanges(basePath: string): boolean {
  const repoInfo = getRepositoryInfo(basePath);

  if (!repoInfo.hasGit) {
    return false;
  }

  try {
    const statusOutput = execSync("git status --porcelain", {
      cwd: basePath,
      encoding: "utf8",
    });

    return statusOutput.trim().length > 0;
  } catch {
    return false;
  }
}
