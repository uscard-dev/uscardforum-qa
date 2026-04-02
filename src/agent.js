import { ToolLoopAgent, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { forumTools } from './tools.js';
import { SYSTEM_PROMPT } from './system-prompt.js';

function createModel({ provider, apiKey, model, baseUrl }) {
  if (provider === 'openai') {
    const openai = createOpenAI({ apiKey, baseURL: baseUrl });
    return openai.chat(model);
  }
  const opts = { apiKey };
  if (provider === 'litellm' && baseUrl) {
    opts.baseURL = baseUrl;
  }
  const google = createGoogleGenerativeAI(opts);
  return google(model);
}

export function createAgent(settings) {
  const agentOpts = {
    model: createModel(settings),
    instructions: SYSTEM_PROMPT,
    tools: forumTools,
    stopWhen: stepCountIs(50),
  };

  if (settings.thinking && settings.provider !== 'openai') {
    agentOpts.providerOptions = {
      google: {
        thinkingConfig: {
          thinkingLevel: 'medium',
          includeThoughts: true,
        },
      },
    };
  }

  return new ToolLoopAgent(agentOpts);
}
