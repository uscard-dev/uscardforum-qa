import { loadSettings, saveSettings } from './settings.js';
import { createAgent } from './agent.js';
import { createUI } from './ui.js';
import {
  listConversations,
  getConversation,
  saveConversation,
  deleteConversation,
  newConversationId,
} from './conversations.js';

function init() {
  const settings = loadSettings();
  const ui = createUI();

  ui.providerInput.value = settings.provider;
  ui.apiKeyInput.value = settings.apiKey;
  ui.modelInput.value = settings.model;
  ui.baseUrlInput.value = settings.baseUrl;
  ui.syncProviderUI();

  let running = false;
  let abortController = null;
  let conversationMessages = [];
  let currentConvoId = null;
  let currentConvoTitle = '';

  function currentSettings() {
    return {
      provider: ui.providerInput.value,
      apiKey: ui.apiKeyInput.value,
      model: ui.modelInput.value,
      baseUrl: ui.baseUrlInput.value,
    };
  }

  let agent = createAgent(currentSettings());

  function onSettingsChange() {
    const s = currentSettings();
    saveSettings(s);
    agent = createAgent(s);
  }

  ui.providerInput.addEventListener('change', onSettingsChange);
  ui.apiKeyInput.addEventListener('change', onSettingsChange);
  ui.modelInput.addEventListener('change', onSettingsChange);
  ui.baseUrlInput.addEventListener('change', onSettingsChange);

  function persistCurrentConvo() {
    if (!currentConvoId || conversationMessages.length === 0) return;
    saveConversation({
      id: currentConvoId,
      title: currentConvoTitle,
      messages: conversationMessages,
    });
  }

  function startNewConvo() {
    persistCurrentConvo();
    currentConvoId = null;
    currentConvoTitle = '';
    conversationMessages = [];
    ui.clearMessages();
    ui.hideHistory();
    ui.inputEl.focus();
  }

  function replayConversation(messages) {
    ui.clearMessages();
    for (const msg of messages) {
      if (msg.role === 'user') {
        ui.addMessage('user', typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
      } else if (msg.role === 'assistant') {
        if (typeof msg.content === 'string') {
          ui.addMessage('assistant', msg.content);
        } else if (Array.isArray(msg.content)) {
          const textParts = msg.content.filter((p) => p.type === 'text').map((p) => p.text).join('');
          const toolParts = msg.content.filter((p) => p.type === 'tool-call');
          for (const tc of toolParts) {
            const card = ui.addToolCard(tc.toolName, tc.args);
            card.dataset.toolName = tc.toolName;
            card.classList.remove('running');
            card.classList.add('done');
            const st = card.querySelector('.tool-st');
            st.className = 'tool-st done';
            st.textContent = '✓';
          }
          if (textParts) ui.addMessage('assistant', textParts);
        }
      } else if (msg.role === 'tool') {
        // tool results displayed inline via tool cards above
      }
    }
  }

  function loadConvo(id) {
    persistCurrentConvo();
    const convo = getConversation(id);
    if (!convo) return;
    currentConvoId = convo.id;
    currentConvoTitle = convo.title;
    conversationMessages = convo.messages;
    replayConversation(convo.messages);
    ui.setStatus('');
    ui.inputEl.focus();
  }

  function refreshHistory() {
    const items = listConversations();
    ui.renderHistory(items, {
      onSelect: loadConvo,
      onDelete: (id) => {
        deleteConversation(id);
        if (currentConvoId === id) {
          currentConvoId = null;
          currentConvoTitle = '';
          conversationMessages = [];
          ui.clearMessages();
        }
        refreshHistory();
      },
    });
  }

  function handleStop() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function handleSend() {
    const prompt = ui.inputEl.value.trim();
    if (!prompt || running) return;

    if (!currentConvoId) {
      currentConvoId = newConversationId();
      currentConvoTitle = prompt.slice(0, 80);
    }

    conversationMessages.push({ role: 'user', content: prompt });

    ui.addMessage('user', prompt);
    ui.inputEl.value = '';
    ui.inputEl.style.height = 'auto';
    ui.setInputEnabled(false, true);
    running = true;

    abortController = new AbortController();

    ui.showThinking('Thinking...');
    let streamEl = null;
    let fullText = '';
    let stepCount = 0;
    let reasoningBlock = null;
    const toolCards = new Map();

    try {
      const result = await agent.stream({
        messages: conversationMessages,
        abortSignal: abortController.signal,
      });

      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'start-step': {
            stepCount++;
            if (reasoningBlock) {
              ui.finalizeReasoningBlock(reasoningBlock);
              reasoningBlock = null;
            }
            if (stepCount > 1) {
              ui.removeThinking();
              streamEl = null;
              fullText = '';
            }
            break;
          }

          case 'reasoning-start': {
            ui.removeThinking();
            reasoningBlock = ui.addReasoningBlock();
            break;
          }

          case 'reasoning-delta': {
            ui.removeThinking();
            if (!reasoningBlock) {
              reasoningBlock = ui.addReasoningBlock();
            }
            ui.updateReasoningBlock(reasoningBlock, part.text);
            break;
          }

          case 'reasoning-end': {
            if (reasoningBlock) {
              ui.finalizeReasoningBlock(reasoningBlock);
              reasoningBlock = null;
            }
            break;
          }

          case 'text-delta': {
            ui.removeThinking();
            if (reasoningBlock) {
              ui.finalizeReasoningBlock(reasoningBlock);
              reasoningBlock = null;
            }
            if (!streamEl) {
              streamEl = ui.addMessage('assistant', '');
            }
            fullText += part.text;
            ui.updateStreamingMessage(streamEl, fullText);
            break;
          }

          case 'tool-call': {
            ui.removeThinking();
            if (reasoningBlock) {
              ui.finalizeReasoningBlock(reasoningBlock);
              reasoningBlock = null;
            }
            const card = ui.addToolCard(part.toolName, part.input);
            card.dataset.toolName = part.toolName;
            toolCards.set(part.toolCallId, card);
            break;
          }

          case 'tool-result': {
            const card = toolCards.get(part.toolCallId);
            if (card) {
              ui.updateToolCard(card, part.output);
            }
            break;
          }

          case 'error': {
            ui.removeThinking();
            ui.addMessage('error', `Error: ${part.error?.message || part.error}`);
            break;
          }
        }
      }

      ui.removeThinking();
      const response = await result.response.catch(() => null);
      const usage = await result.usage.catch(() => null);
      if (response) conversationMessages.push(...response.messages);
      const totalIn = usage?.inputTokens || 0;
      const totalOut = usage?.outputTokens || 0;
      ui.setStatus(`${stepCount} step(s) · ${totalIn + totalOut} tokens`);
    } catch (err) {
      ui.removeThinking();
      if (err.name === 'AbortError' || abortController?.signal?.aborted) {
        if (fullText) {
          conversationMessages.push({ role: 'assistant', content: fullText });
        }
        ui.setStatus('Stopped');
      } else {
        ui.addMessage('error', `Error: ${err.message}`);
        ui.setStatus('');
      }
    } finally {
      abortController = null;
      running = false;
      ui.setInputEnabled(true, false);
      ui.inputEl.focus();
      persistCurrentConvo();
    }
  }

  ui.sendBtn.addEventListener('click', () => {
    if (running) {
      handleStop();
    } else {
      handleSend();
    }
  });
  ui.inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  ui.newBtn.addEventListener('click', () => {
    if (running) handleStop();
    startNewConvo();
  });

  ui.onHistoryOpen = refreshHistory;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
