import { PraisonAIAgents } from "praisonai";
import "dotenv/config";
import { storyAgent, summaryAgent } from "./agents";

const agents = new PraisonAIAgents({
  agents: [storyAgent, summaryAgent],
});

agents.start();
