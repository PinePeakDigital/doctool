/**
 * Utility functions for validating API key configuration
 */

export interface APIKeyValidationResult {
  isValid: boolean;
  errorMessage?: string;
  helpMessage?: string;
}

/**
 * Validates that the OpenAI API key is properly configured
 */
export function validateOpenAIKey(): APIKeyValidationResult {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      isValid: false,
      errorMessage: "OpenAI API key not found",
      helpMessage: `
🔑 OpenAI API Key Required

To use AI-powered features (enhance, update), you need to set up your OpenAI API key:

1. Get your API key from: https://platform.openai.com/api-keys
2. Set it as an environment variable:

   Option A: Environment variable
   export OPENAI_API_KEY="sk-your-api-key-here"

   Option B: .env file (recommended)
   echo "OPENAI_API_KEY=sk-your-api-key-here" > .env

💡 You can still use the 'validate' and 'init' commands without an API key.
`
    };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return {
      isValid: false,
      errorMessage: "Invalid OpenAI API key format",
      helpMessage: `
🔑 Invalid API Key Format

Your OpenAI API key should start with 'sk-'. 

Please check your API key from: https://platform.openai.com/api-keys
`
    };
  }
  
  return { isValid: true };
}

/**
 * Displays a helpful error message and exits if API key is invalid
 */
export function requireValidAPIKey(): void {
  const validation = validateOpenAIKey();
  
  if (!validation.isValid) {
    console.error(`❌ ${validation.errorMessage}`);
    console.log(validation.helpMessage);
    process.exit(1);
  }
}

/**
 * Displays a warning if API key is not configured but continues execution
 */
export function warnIfNoAPIKey(): boolean {
  const validation = validateOpenAIKey();
  
  if (!validation.isValid) {
    console.warn(`⚠️  ${validation.errorMessage}`);
    console.log(`
🤖 AI features disabled. Using fallback content generation.
${validation.helpMessage}
`);
    return false;
  }
  
  return true;
}
