import { ToolLoopAgent, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { forumTools } from './tools.js';
import { SYSTEM_PROMPT } from './system-prompt.js';

function createModel({ provider, apiKey, model, baseUrl }) {
  const opts = { apiKey };
  if (provider === 'litellm' && baseUrl) {
    opts.baseURL = baseUrl;
  }
  const google = createGoogleGenerativeAI(opts);
  return google(model);
}

export function createAgent(settings) {
  return new ToolLoopAgent({
    model: createModel(settings),
    instructions: SYSTEM_PROMPT,
    tools: forumTools,
    stopWhen: stepCountIs(50),
  });
}
