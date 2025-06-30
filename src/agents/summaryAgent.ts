import { Agent } from "praisonai";

export const summaryAgent = new Agent({
  instructions: "Summarize the provided AI story in one sentence with emojis.",
  name: "SummaryAgent",
});
