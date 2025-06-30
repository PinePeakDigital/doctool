import { Agent } from "praisonai";

export const storyAgent = new Agent({
  instructions:
    "Generate a very short story (2-3 sentences) about artificial intelligence with emojis.",
  name: "StoryAgent",
});
