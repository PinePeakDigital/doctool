import { PraisonAIAgents } from "praisonai";
import "dotenv/config";
import { storyAgent, summaryAgent } from "./agents";
import { initializeKnowledgeFiles } from "./utils/knowledgeManager";
import { enhanceKnowledgeFiles, updateKnowledgeFilesWithAI } from "./utils/aiContentGenerator";
import { validateDocs } from "./validateDocs";

function showHelp() {
  console.log(`
DocTool - Documentation validation and management tool

Usage:
  doctool [command] [options]

Commands:
  validate [path]    Validate documentation files (default: current directory)
  init [path]        Initialize knowledge files (default: current directory)
  enhance [path]     Enhance knowledge files with AI-generated content (default: current directory)
  update [path]      Update existing knowledge files based on code changes (default: current directory)
  agents            Start AI agents (PraisonAI)
  help              Show this help message

Examples:
  doctool validate
  doctool validate /path/to/docs
  doctool init
  doctool init /path/to/project
  doctool enhance
  doctool enhance /path/to/project
  doctool agents`);
}

async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const targetPath = args[1] || process.cwd();

  console.log("🚀 DocTool CLI");

  switch (command) {
    case 'validate':
      console.log(`\n📋 Validating documentation in: ${targetPath}`);
      await validateDocs(targetPath);
      break;

    case 'init':
      console.log(`\n📚 Initializing knowledge files in: ${targetPath}`);
      initializeKnowledgeFiles(targetPath);
      break;

    case 'enhance':
      console.log(`\n🤖 Enhancing knowledge files with AI in: ${targetPath}`);
      await enhanceKnowledgeFiles(targetPath);
      break;

    case 'update':
      console.log(`\n🔄 Updating knowledge files based on changes in: ${targetPath}`);
      await updateKnowledgeFilesWithAI(targetPath);
      break;

    case 'agents':
      console.log(`\n🤖 Starting AI agents...`);
      const agents = new PraisonAIAgents({
        agents: [storyAgent, summaryAgent],
      });
      agents.start();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

// Run the CLI
runCLI().catch((error) => {
  console.error("❌ Error running DocTool:", error);
  process.exit(1);
});
