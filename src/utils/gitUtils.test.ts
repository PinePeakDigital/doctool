import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  getRepositoryInfo,
  getChangesSinceDate,
  getLastUpdateTimestamp,
  hasUncommittedChanges,
} from "./gitUtils";

describe("Git Utils", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-utils-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("getRepositoryInfo", () => {
    it("should detect non-git directory", () => {
      const repoInfo = getRepositoryInfo(tempDir);

      expect(repoInfo.hasGit).toBe(false);
      expect(repoInfo.workingDirectory).toBe(tempDir);
      expect(repoInfo.lastCommitDate).toBeUndefined();
    });

    it("should handle missing git command gracefully", () => {
      // This test assumes git is available, but tests error handling
      const repoInfo = getRepositoryInfo("/nonexistent/directory");

      expect(repoInfo.hasGit).toBe(false);
      expect(repoInfo.workingDirectory).toBe("/nonexistent/directory");
    });
  });

  describe("getChangesSinceDate", () => {
    it("should fall back to file system timestamps when git is not available", () => {
      // Create test files with different timestamps
      const testFile = path.join(tempDir, "test.ts");
      fs.writeFileSync(testFile, 'console.log("test");');

      // Set modification time to recent
      const recentDate = new Date();
      fs.utimesSync(testFile, recentDate, recentDate);

      const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const changes = getChangesSinceDate(tempDir, oldDate);

      expect(changes.modifiedFiles).toContain("test.ts");
    });

    it("should filter out irrelevant files", () => {
      // Create files that should be filtered out
      fs.mkdirSync(path.join(tempDir, "node_modules"));
      fs.writeFileSync(
        path.join(tempDir, "node_modules", "package.js"),
        "module.exports = {};",
      );
      fs.writeFileSync(
        path.join(tempDir, "test.test.ts"),
        'it("should work", () => {});',
      );

      const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const changes = getChangesSinceDate(tempDir, oldDate);

      expect(changes.modifiedFiles).not.toContain("node_modules/package.js");
      expect(changes.modifiedFiles).not.toContain("test.test.ts");
    });
  });

  describe("getLastUpdateTimestamp", () => {
    it("should extract timestamp from knowledge file", () => {
      const knowledgeContent = `# Test Directory

## Overview

Test content here.

---

*Last updated: 2025-06-30*
*Content generated with AI assistance*`;

      const knowledgeFile = path.join(tempDir, "knowledge.md");
      fs.writeFileSync(knowledgeFile, knowledgeContent);

      const timestamp = getLastUpdateTimestamp(knowledgeFile);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp?.toISOString().split("T")[0]).toBe("2025-06-30");
    });

    it("should fall back to file modification time", () => {
      const knowledgeContent = `# Test Directory

No timestamp in this file.`;

      const knowledgeFile = path.join(tempDir, "knowledge.md");
      fs.writeFileSync(knowledgeFile, knowledgeContent);

      const timestamp = getLastUpdateTimestamp(knowledgeFile);

      expect(timestamp).toBeInstanceOf(Date);
      // Should be recent (file just created)
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - timestamp!.getTime());
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });

    it("should return null for non-existent file", () => {
      const timestamp = getLastUpdateTimestamp(
        path.join(tempDir, "nonexistent.md"),
      );

      expect(timestamp).toBeNull();
    });
  });

  describe("hasUncommittedChanges", () => {
    it("should return false for non-git directory", () => {
      const hasChanges = hasUncommittedChanges(tempDir);

      expect(hasChanges).toBe(false);
    });
  });
});
