import { OpenAI } from 'openai';

// Check if API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not defined in environment variables');
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get the correct model name
export function getOpenAIModel(): string {
  // Default to GPT-4.1 as specified in the PRD
  return process.env.OPENAI_MODEL || 'gpt-4.1';
}

export default openai; 