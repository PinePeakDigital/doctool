#!/usr/bin/env tsx
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
                       --interactive, -i    Prompt before each update
                       --dry-run, -d       Show what would be updated without making changes
  agents            Start AI agents (PraisonAI)
  help              Show this help message

Examples:
  doctool validate
  doctool validate /path/to/docs
  doctool init
  doctool init /path/to/project
  doctool enhance
  doctool enhance /path/to/project
  doctool update                     # Auto-update, use git to review
  doctool update --interactive       # Prompt before each update
  doctool update --dry-run          # See what would be updated
  doctool agents`);
}

async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  // Parse flags and path for all commands  
  const flags: string[] = [];
  const nonFlagArgs: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('-')) {
      flags.push(arg);
      // If this flag might take a value, check the next argument
      if (arg === '--severity-threshold' && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags.push(args[i + 1]);
        i++; // Skip the next argument since we consumed it
      }
    } else {
      nonFlagArgs.push(arg);
    }
  }
  
  const targetPath = nonFlagArgs[1] || process.cwd();

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
      
      // Parse flags for update command
      const interactive = flags.includes('--interactive') || flags.includes('-i');
      const dryRun = flags.includes('--dry-run') || flags.includes('-d');
      
      // Parse severity threshold
      let severityThreshold: 'low' | 'medium' | 'high' = 'medium';
      const severityFlag = flags.find(f => f.startsWith('--severity-threshold='));
      if (severityFlag) {
        const value = severityFlag.split('=')[1] as 'low' | 'medium' | 'high';
        if (['low', 'medium', 'high'].includes(value)) {
          severityThreshold = value;
        }
      } else {
        // Check for separate flag and value
        const severityIndex = flags.indexOf('--severity-threshold');
        if (severityIndex !== -1 && severityIndex + 1 < flags.length) {
          const value = flags[severityIndex + 1] as 'low' | 'medium' | 'high';
          if (['low', 'medium', 'high'].includes(value)) {
            severityThreshold = value;
          }
        }
      }
      
      await updateKnowledgeFilesWithAI(targetPath, { interactive, dryRun, severityThreshold });
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
