const STORAGE_KEY = 'qabot_conversations';
const MAX_CONVERSATIONS = 50;

function loadAll() {
  const raw = GM_getValue(STORAGE_KEY, '[]');
  return JSON.parse(raw);
}

function saveAll(convos) {
  GM_setValue(STORAGE_KEY, JSON.stringify(convos.slice(0, MAX_CONVERSATIONS)));
}

export function listConversations() {
  return loadAll().map(({ id, title, createdAt }) => ({ id, title, createdAt }));
}

export function getConversation(id) {
  return loadAll().find((c) => c.id === id) || null;
}

export function saveConversation({ id, title, messages }) {
  const convos = loadAll();
  const idx = convos.findIndex((c) => c.id === id);
  const entry = { id, title, messages, createdAt: idx >= 0 ? convos[idx].createdAt : Date.now() };
  if (idx >= 0) {
    convos[idx] = entry;
  } else {
    convos.unshift(entry);
  }
  saveAll(convos);
}

export function deleteConversation(id) {
  saveAll(loadAll().filter((c) => c.id !== id));
}

export function newConversationId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
