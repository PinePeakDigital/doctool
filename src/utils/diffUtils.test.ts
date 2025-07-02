import { describe, it, expect } from "vitest";
import {
  generateDiff,
  formatDiffForConsole,
  parseMarkdownSections,
  mergeSections,
} from "./diffUtils";

describe("Diff Utils", () => {
  describe("generateDiff", () => {
    it("should detect no changes for identical content", () => {
      const content = "Line 1\nLine 2\nLine 3";
      const diff = generateDiff(content, content, "test.md");

      expect(diff.hasChanges).toBe(false);
      expect(diff.lines.every((line) => line.type === "context")).toBe(true);
    });

    it("should detect additions", () => {
      const oldContent = "Line 1\nLine 2";
      const newContent = "Line 1\nLine 2\nLine 3";
      const diff = generateDiff(oldContent, newContent, "test.md");

      expect(diff.hasChanges).toBe(true);
      expect(diff.lines.some((line) => line.type === "add")).toBe(true);
      expect(diff.lines.find((line) => line.type === "add")?.content).toBe(
        "Line 3",
      );
    });

    it("should detect deletions", () => {
      const oldContent = "Line 1\nLine 2\nLine 3";
      const newContent = "Line 1\nLine 3";
      const diff = generateDiff(oldContent, newContent, "test.md");

      expect(diff.hasChanges).toBe(true);
      expect(diff.lines.some((line) => line.type === "remove")).toBe(true);
      expect(diff.lines.find((line) => line.type === "remove")?.content).toBe(
        "Line 2",
      );
    });

    it("should detect modifications", () => {
      const oldContent = "Line 1\nOld Line 2\nLine 3";
      const newContent = "Line 1\nNew Line 2\nLine 3";
      const diff = generateDiff(oldContent, newContent, "test.md");

      expect(diff.hasChanges).toBe(true);
      expect(diff.lines.some((line) => line.type === "remove")).toBe(true);
      expect(diff.lines.some((line) => line.type === "add")).toBe(true);
    });
  });

  describe("formatDiffForConsole", () => {
    it("should format diff with colors and line numbers", () => {
      const oldContent = "Line 1\nOld Line 2\nLine 3";
      const newContent = "Line 1\nNew Line 2\nLine 3";
      const diff = generateDiff(oldContent, newContent, "test.md");

      const formatted = formatDiffForConsole(diff);

      expect(formatted).toContain("📄 Changes in test.md:");
      expect(formatted).toContain("Old Line 2");
      expect(formatted).toContain("\x1b[31m"); // Red color for removal
      expect(formatted).toContain("\x1b[32m"); // Green color for addition
      // Note: Our simple diff algorithm may show this as remove + add rather than modify
    });

    it("should handle no changes", () => {
      const content = "Line 1\nLine 2\nLine 3";
      const diff = generateDiff(content, content, "test.md");

      const formatted = formatDiffForConsole(diff);

      expect(formatted).toBe("No changes in test.md");
    });
  });

  describe("parseMarkdownSections", () => {
    it("should parse markdown sections correctly", () => {
      const content = `# Main Title

Some intro content.

## Overview

Overview content here.

### Details

Detail content here.

## Another Section

More content.`;

      const sections = parseMarkdownSections(content);

      expect(sections).toHaveLength(4);
      expect(sections[0].heading).toBe("Main Title");
      expect(sections[0].level).toBe(1);
      expect(sections[1].heading).toBe("Overview");
      expect(sections[1].level).toBe(2);
      expect(sections[2].heading).toBe("Details");
      expect(sections[2].level).toBe(3);
      expect(sections[3].heading).toBe("Another Section");
      expect(sections[3].level).toBe(2);
    });

    it("should handle content without headings", () => {
      const content = `Just some content without headings.
Multiple lines of text.`;

      const sections = parseMarkdownSections(content);

      expect(sections).toHaveLength(0);
    });

    it("should handle empty content", () => {
      const sections = parseMarkdownSections("");

      expect(sections).toHaveLength(0);
    });
  });

  describe("mergeSections", () => {
    it("should merge sections preserving new content", () => {
      const oldSections = [
        {
          heading: "Overview",
          content: "# Overview\nOld overview content",
          startLine: 0,
          endLine: 1,
          level: 1,
        },
        {
          heading: "Manual Section",
          content: "# Manual Section\nManually written content",
          startLine: 2,
          endLine: 3,
          level: 1,
        },
      ];

      const newSections = [
        {
          heading: "Overview",
          content: "# Overview\nNew overview content",
          startLine: 0,
          endLine: 1,
          level: 1,
        },
        {
          heading: "New Feature",
          content: "# New Feature\nNew feature content",
          startLine: 2,
          endLine: 3,
          level: 1,
        },
      ];

      const merged = mergeSections(oldSections, newSections);

      expect(merged).toContain("New overview content");
      expect(merged).toContain("New feature content");
      expect(merged).toContain("Manually written content");
    });

    it("should handle empty section arrays", () => {
      const merged1 = mergeSections([], []);
      const merged2 = mergeSections(
        [
          {
            heading: "Test",
            content: "# Test\nContent",
            startLine: 0,
            endLine: 1,
            level: 1,
          },
        ],
        [],
      );
      const merged3 = mergeSections(
        [],
        [
          {
            heading: "Test",
            content: "# Test\nContent",
            startLine: 0,
            endLine: 1,
            level: 1,
          },
        ],
      );

      expect(merged1).toBe("");
      expect(merged2).toContain("Content");
      expect(merged3).toContain("Content");
    });
  });
});
