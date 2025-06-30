import { PraisonAIAgents } from "praisonai";
import "dotenv/config";
import { storyAgent, summaryAgent } from "./agents";
import { initializeKnowledgeFiles } from "./utils/knowledgeManager";

async function main() {
  console.log("🚀 Starting DocTool...");
  
  // Initialize knowledge files for all directories
  console.log("\n📚 Initializing knowledge files...");
  initializeKnowledgeFiles();
  
  // Start the AI agents
  console.log("\n🤖 Starting AI agents...");
  const agents = new PraisonAIAgents({
    agents: [storyAgent, summaryAgent],
  });
  
  agents.start();
}

// Run the main function
main().catch((error) => {
  console.error("❌ Error starting DocTool:", error);
  process.exit(1);
});
