import * as fs from "fs";
import * as path from "path";
import { PraisonAIAgents } from "praisonai";
import { contentGeneratorAgent } from "../agents/contentGeneratorAgent";

interface DirectoryAnalysis {
  name: string;
  path: string;
  files: string[];
  subdirectories: string[];
  codeFiles: string[];
  currentKnowledgeContent?: string;
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
        if (
          item.name.endsWith(".ts") ||
          item.name.endsWith(".js") ||
          item.name.endsWith(".tsx") ||
          item.name.endsWith(".jsx")
        ) {
          codeFiles.push(item.name);
        }
      } else if (item.isDirectory() && !item.name.startsWith(".")) {
        subdirectories.push(item.name);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error);
  }

  // Check for existing knowledge file
  let currentKnowledgeContent: string | undefined;
  const knowledgeFiles = ["KNOWLEDGE.md", "knowledge.md", "README.md"];

  for (const fileName of knowledgeFiles) {
    const filePath = path.join(dirPath, fileName);
    if (fs.existsSync(filePath)) {
      try {
        currentKnowledgeContent = fs.readFileSync(filePath, "utf8");
        break;
      } catch (error) {
        console.warn(
          `Warning: Could not read knowledge file ${filePath}:`,
          error,
        );
      }
    }
  }

  return {
    name: dirName,
    path: dirPath,
    files,
    subdirectories,
    codeFiles,
    currentKnowledgeContent,
  };
}

/**
 * Reads code files from a directory for analysis
 */
export function getCodeContent(
  dirPath: string,
  codeFiles: string[],
): Record<string, string> {
  const codeContent: Record<string, string> = {};

  for (const fileName of codeFiles) {
    try {
      const filePath = path.join(dirPath, fileName);
      const content = fs.readFileSync(filePath, "utf8");
      codeContent[fileName] = content;
    } catch (error) {
      console.warn(`Warning: Could not read code file ${fileName}:`, error);
    }
  }

  return codeContent;
}

/**
 * Creates a prompt for the content generator agent
 */
export function createContentGenerationPrompt(
  analysis: DirectoryAnalysis,
  codeContent: Record<string, string>,
): string {
  let prompt = `Analyze the following directory and generate comprehensive knowledge file content:\n\n`;

  prompt += `**Directory:** ${analysis.name}\n`;
  prompt += `**Path:** ${analysis.path}\n\n`;

  prompt += `**Files in directory:**\n`;
  analysis.files.forEach((file) => {
    prompt += `- ${file}\n`;
  });

  if (analysis.subdirectories.length > 0) {
    prompt += `\n**Subdirectories:**\n`;
    analysis.subdirectories.forEach((dir) => {
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
export async function generateKnowledgeContent(
  dirPath: string,
): Promise<string | null> {
  try {
    console.log(`\n📝 Analyzing directory: ${dirPath}`);

    // Analyze the directory
    const analysis = analyzeDirectoryForContent(dirPath);

    // Get code content for analysis
    const codeContent = getCodeContent(dirPath, analysis.codeFiles);

    // Create prompt for the AI agent
    createContentGenerationPrompt(analysis, codeContent);

    console.log(`🤖 Generating content with AI...`);

    // Use the content generator agent
    const agents = new PraisonAIAgents({
      agents: [contentGeneratorAgent],
    });

    // This is a simplified approach - in a real implementation we'd want to
    // capture the agent's response more systematically
    const result = await agents.start();

    // Convert result to string if it's an array or object
    if (Array.isArray(result)) {
      return result.join("\n\n") || null;
    } else if (typeof result === "object" && result !== null) {
      return JSON.stringify(result, null, 2) || null;
    }

    return (result as string) || null;
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
    const knowledgeFilePath = path.join(dirPath, "knowledge.md");

    // Add timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const contentWithTimestamp =
      content +
      `\n\n---\n\n*Last updated: ${timestamp}*\n*Content generated with AI assistance*`;

    fs.writeFileSync(knowledgeFilePath, contentWithTimestamp, "utf8");
    console.log(`✅ Updated knowledge file: ${knowledgeFilePath}`);
    return true;
  } catch (error) {
    console.error(`Error updating knowledge file for ${dirPath}:`, error);
    return false;
  }
}
