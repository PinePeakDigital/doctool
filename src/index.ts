import "dotenv/config";
import { validateOpenAIKey } from "./utils/apiKeyValidator";
import { initializeKnowledgeFiles } from "./utils/knowledgeManager";
import { enhanceKnowledgeFiles, updateKnowledgeFilesWithAI } from "./utils/aiContentGenerator";
import { validateDocs } from "./validateDocs";
import { warnIfNoAPIKey, requireValidAPIKey } from "./utils/apiKeyValidator";

function showHelp() {
  console.log(`🚀 DocTool CLI

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
  doctool update --verbose           # Show detailed issue information
  doctool agents`);
}

function showValidateHelp() {
  console.log(`🔍 DocTool Validate Command

Validates documentation files for broken links, missing references, and content issues.

Usage:
  doctool validate [path] [options]

Arguments:
  path              Path to validate (default: current directory)

Options:
  --help, -h        Show this help message

Examples:
  doctool validate
  doctool validate /path/to/docs
  doctool validate --help`);
}

function showInitHelp() {
  console.log(`📚 DocTool Init Command

Initializes knowledge files across your project directories.

Usage:
  doctool init [path] [options]

Arguments:
  path              Path to initialize (default: current directory)

Options:
  --help, -h        Show this help message

Examples:
  doctool init
  doctool init /path/to/project
  doctool init --help`);
}

function showEnhanceHelp() {
  console.log(`🤖 DocTool Enhance Command

Enhances knowledge files with AI-generated content.

Usage:
  doctool enhance [path] [options]

Arguments:
  path              Path to enhance (default: current directory)

Options:
  --help, -h        Show this help message

API Key:
  Requires OPENAI_API_KEY environment variable for AI features.
  Falls back to intelligent content generation if not set.

Examples:
  doctool enhance
  doctool enhance /path/to/project
  doctool enhance --help`);
}

function showUpdateHelp() {
  console.log(`🔄 DocTool Update Command

Updates documentation using issue-driven targeted fixes.

Usage:
  doctool update [path] [options]

Arguments:
  path              Path to update (default: current directory)

Options:
  --interactive, -i        Prompt before each update
  --dry-run, -d           Show what would be updated without making changes
  --verbose, -v           Show detailed information about issues found
  --severity-threshold     Include fixes at this severity level and above (low|medium|high, default: medium)
  --help, -h              Show this help message

API Key:
  Requires OPENAI_API_KEY environment variable for AI features.
  Falls back to intelligent content generation if not set.

Examples:
  doctool update
  doctool update --interactive
  doctool update --dry-run
  doctool update --verbose
  doctool update --verbose --dry-run --severity-threshold low
  doctool update /path/to/project --interactive
  doctool update --help`);
}

function showAgentsHelp() {
  console.log(`🤖 DocTool Agents Command

Starts AI agents for advanced documentation processing.

Usage:
  doctool agents [options]

Options:
  --help, -h        Show this help message

Note:
  This command requires PraisonAI to be properly configured.

Examples:
  doctool agents
  doctool agents --help`);
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
      // Check for help flag
      if (flags.includes('--help') || flags.includes('-h')) {
        showValidateHelp();
        break;
      }
      console.log(`\n📋 Validating documentation in: ${targetPath}`);
      await validateDocs(targetPath);
      break;

    case 'init':
      // Check for help flag
      if (flags.includes('--help') || flags.includes('-h')) {
        showInitHelp();
        break;
      }
      console.log(`\n📚 Initializing knowledge files in: ${targetPath}`);
      initializeKnowledgeFiles(targetPath);
      break;

    case 'enhance':
      // Check for help flag
      if (flags.includes('--help') || flags.includes('-h')) {
        showEnhanceHelp();
        break;
      }
      
      // Check for API key but warn instead of failing
      const hasAPIKey = warnIfNoAPIKey();
      if (!hasAPIKey) {
        console.log(`\n🤖 Enhancing knowledge files (fallback mode) in: ${targetPath}`);
      } else {
        console.log(`\n🤖 Enhancing knowledge files with AI in: ${targetPath}`);
      }
      
      await enhanceKnowledgeFiles(targetPath);
      break;

    case 'update':
      // Check for help flag
      if (flags.includes('--help') || flags.includes('-h')) {
        showUpdateHelp();
        break;
      }
      
      // Check for API key but warn instead of failing
      const hasUpdateAPIKey = warnIfNoAPIKey();
      if (!hasUpdateAPIKey) {
        console.log(`\n🔄 Updating knowledge files (fallback mode) in: ${targetPath}`);
      } else {
        console.log(`\n🔄 Updating knowledge files based on changes in: ${targetPath}`);
      }
      
      // Parse flags for update command
      const interactive = flags.includes('--interactive') || flags.includes('-i');
      const dryRun = flags.includes('--dry-run') || flags.includes('-d');
      const verbose = flags.includes('--verbose') || flags.includes('-v');
      
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
      
      await updateKnowledgeFilesWithAI(targetPath, { interactive, dryRun, severityThreshold, verbose });
      break;

    case 'agents':
      // Check for help flag
      if (flags.includes('--help') || flags.includes('-h')) {
        showAgentsHelp();
        break;
      }
      
      // Require valid API key for agents
      requireValidAPIKey();
      
      console.log(`\n🤖 Starting AI agents...`);
      
      // Dynamic import to avoid startup errors
      try {
        const { PraisonAIAgents } = await import('praisonai');
        const { storyAgent, summaryAgent } = await import('./agents');
        
        const agents = new PraisonAIAgents({
          agents: [storyAgent, summaryAgent],
        });
        agents.start();
      } catch (error) {
        console.error('❌ Error starting AI agents:', error);
        console.log(`
💡 Make sure your OPENAI_API_KEY is set correctly and PraisonAI is properly configured.`);
        process.exit(1);
      }
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
