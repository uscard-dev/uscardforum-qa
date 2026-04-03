import { loadSettings, saveSettings } from './settings.js';
import { createAgent } from './agent.js';
import { createUI } from './ui.js';
import { getPageCacheKey } from './page-cache.js';
import { createPost, getCurrentUser, getUserProfile } from './forum-api.js';
import {
  beginConversationTurn,
  snapshotConversationMessages,
} from './conversation-session.js';
import {
  listConversations,
  getConversation,
  saveConversation,
  deleteConversation,
  newConversationId,
} from './conversations.js';

function hideDifyChatbot() {
  const btn = document.getElementById('dify-chatbot-bubble-button');
  const win = document.getElementById('dify-chatbot-bubble-window');
  if (btn) btn.style.display = 'none';
  if (win) win.style.display = 'none';
}

function init() {
  const pageCacheKey = getPageCacheKey(window.location.href);
  const panelOpenKey = `panelOpen:${pageCacheKey}`;
  const lastConvoKey = `lastConvoId:${pageCacheKey}`;

  // Hide the site's built-in Dify chatbot
  hideDifyChatbot();
  const observer = new MutationObserver(hideDifyChatbot);
  observer.observe(document.body, { childList: true, subtree: true });

  const settings = loadSettings();
  const ui = createUI();

  let cachedUsername = null;
  getCurrentUser().then((u) => {
    if (u && !u._httpError) cachedUsername = u.username;
  });

  ui.providerInput.value = settings.provider;
  ui.apiKeyInput.value = settings.apiKey;
  ui.modelInput.value = settings.model;
  ui.modelSelectInput.value = settings.model;
  ui.baseUrlInput.value = settings.baseUrl;
  ui.thinkingInput.checked = settings.thinking;
  ui.themeInput.checked = settings.theme === 'light';
  ui.applyTheme(settings.theme === 'light');
  ui.syncProviderUI();

  ui.onReplyPost = async (raw, replyTo) => {
    const match = window.location.pathname.match(/^\/t\/[^/]+\/(\d+)(?:\/\d+)?\/?$/);
    if (!match) throw new Error('Not on a topic page');

    const result = await createPost({
      topic_id: Number(match[1]),
      raw,
      reply_to_post_number: replyTo,
    });

    if (result._httpError) throw new Error(`HTTP ${result._httpError}`);

    const slug = window.location.pathname.match(/^\/t\/([^/]+)\//)?.[1] || 'topic';
    window.location.href = `/t/${slug}/${result.topic_id}/${result.post_number}`;
    return result;
  };

  // Restore panel open state
  if (GM_getValue(panelOpenKey, false)) ui.openPanel();

  let running = false;
  let abortController = null;
  let conversationMessages = [];
  let currentConvoId = null;
  let currentConvoTitle = '';
  let inFlightAssistantText = '';
  let userInstruction = null;

  function currentSettings() {
    return {
      provider: ui.providerInput.value,
      apiKey: ui.apiKeyInput.value,
      model: ui.modelInput.value,
      baseUrl: ui.baseUrlInput.value,
      thinking: ui.thinkingInput.checked,
      theme: ui.themeInput.checked ? 'light' : 'dark',
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
  ui.thinkingInput.addEventListener('change', onSettingsChange);
  ui.themeInput.addEventListener('change', onSettingsChange);

  // Save panel open/close state
  ui.onPanelToggle = (open) => GM_setValue(panelOpenKey, open);

  function persistCurrentConvo() {
    if (!currentConvoId || conversationMessages.length === 0) return;
    saveConversation({
      id: currentConvoId,
      title: currentConvoTitle,
      messages: conversationMessages,
    });
    GM_setValue(lastConvoKey, currentConvoId);
  }

  function persistConvoSnapshot(messages) {
    if (!currentConvoId || messages.length === 0) return;
    saveConversation({
      id: currentConvoId,
      title: currentConvoTitle,
      messages,
    });
    GM_setValue(lastConvoKey, currentConvoId);
  }

  window.addEventListener('beforeunload', () => {
    const snapshot = snapshotConversationMessages(conversationMessages, inFlightAssistantText);
    persistConvoSnapshot(snapshot);
  });

  function startNewConvo() {
    persistCurrentConvo();
    currentConvoId = null;
    currentConvoTitle = '';
    conversationMessages = [];
    GM_setValue(lastConvoKey, '');
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

    const nextTurn = beginConversationTurn({
      currentConvoId,
      currentConvoTitle,
      conversationMessages,
      prompt,
      newConversationId,
      persistConversation(snapshot) {
        currentConvoId = snapshot.id;
        currentConvoTitle = snapshot.title;
        persistConvoSnapshot(snapshot.messages);
      },
    });
    currentConvoId = nextTurn.currentConvoId;
    currentConvoTitle = nextTurn.currentConvoTitle;
    conversationMessages = nextTurn.conversationMessages;

    // Fetch user bio instruction for new conversations
    if (conversationMessages.length === 1 && cachedUsername) {
      try {
        const profile = await getUserProfile({ username: cachedUsername });
        if (profile && !profile._httpError && profile.bio_raw) {
          const aiIdx = profile.bio_raw.indexOf('AI');
          if (aiIdx !== -1) {
            userInstruction = profile.bio_raw.slice(aiIdx);
          } else {
            userInstruction = null;
          }
        } else {
          userInstruction = null;
        }
      } catch {
        userInstruction = null;
      }
    }

    ui.addMessage('user', prompt);
    ui.inputEl.value = '';
    ui.inputEl.style.height = 'auto';
    ui.setInputEnabled(false, true);
    running = true;

    abortController = new AbortController();

    ui.setGenerating(true);
    ui.showThinking('Thinking...');
    let streamEl = null;
    let fullText = '';
    inFlightAssistantText = '';
    let stepCount = 0;
    let reasoningBlock = null;
    const toolCards = new Map();

    try {
      const pageUrl = window.location.href.replace(/^(https?:\/\/[^/]+\/t\/[^/]+\/\d+)\/\d+\/?$/, '$1/');
      const systemMessages = [
        { role: 'system', content: `User is currently viewing: ${pageUrl}` },
      ];
      if (userInstruction) {
        systemMessages.push({ role: 'system', content: `IMPORTANT — User style instructions (HIGHEST PRIORITY, override default tone and style):\n${userInstruction}` });
      }
      const result = await agent.stream({
        messages: [...systemMessages, ...conversationMessages],
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
            inFlightAssistantText = fullText;
            ui.updateStreamingMessage(streamEl, fullText);
            break;
          }

          case 'tool-call': {
            ui.removeThinking();
            if (reasoningBlock) {
              ui.finalizeReasoningBlock(reasoningBlock);
              reasoningBlock = null;
            }
            const existingCard = ui.findToolCard(part.toolName);
            let card;
            if (existingCard) {
              card = ui.reuseToolCard(existingCard, part.toolName, part.input);
            } else {
              card = ui.addToolCard(part.toolName, part.input);
            }
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
      ui.flushStreamingRender();
      const response = await result.response.catch(() => null);
      const usage = await result.usage.catch(() => null);
      if (response) conversationMessages.push(...response.messages);
      inFlightAssistantText = '';
      const totalIn = usage?.inputTokens || 0;
      const totalOut = usage?.outputTokens || 0;
      ui.setStatus(`${stepCount} step(s) · ${totalIn + totalOut} tokens`);
    } catch (err) {
      ui.removeThinking();
      if (err.name === 'AbortError' || abortController?.signal?.aborted) {
        if (fullText) {
          conversationMessages.push({ role: 'assistant', content: fullText });
        }
        inFlightAssistantText = '';
        ui.setStatus('Stopped');
      } else {
        ui.addMessage('error', `Error: ${err.message}`);
        ui.setStatus('');
      }
    } finally {
      inFlightAssistantText = '';
      abortController = null;
      running = false;
      ui.setGenerating(false);
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
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSend();
    }
  });

  ui.newBtn.addEventListener('click', () => {
    if (running) handleStop();
    startNewConvo();
  });

  ui.onHistoryOpen = refreshHistory;

  // Restore last conversation on load
  const lastId = GM_getValue(lastConvoKey, null);
  if (lastId) {
    const convo = getConversation(lastId);
    if (convo) {
      currentConvoId = convo.id;
      currentConvoTitle = convo.title;
      conversationMessages = convo.messages;
      replayConversation(convo.messages);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
