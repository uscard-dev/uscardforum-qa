import assert from 'node:assert/strict';
import test from 'node:test';

import {
  beginConversationTurn,
  snapshotConversationMessages,
} from '../src/conversation-session.js';

test('beginConversationTurn creates and persists a new conversation immediately', () => {
  const persisted = [];

  const next = beginConversationTurn({
    currentConvoId: null,
    currentConvoTitle: '',
    conversationMessages: [],
    prompt: 'Can you draft a reply for this thread?',
    newConversationId: () => 'convo-123',
    persistConversation(snapshot) {
      persisted.push(snapshot);
    },
  });

  assert.deepEqual(next, {
    currentConvoId: 'convo-123',
    currentConvoTitle: 'Can you draft a reply for this thread?',
    conversationMessages: [
      { role: 'user', content: 'Can you draft a reply for this thread?' },
    ],
  });

  assert.deepEqual(persisted, [
    {
      id: 'convo-123',
      title: 'Can you draft a reply for this thread?',
      messages: [
        { role: 'user', content: 'Can you draft a reply for this thread?' },
      ],
    },
  ]);
});

test('snapshotConversationMessages appends an in-flight assistant draft for unload persistence', () => {
  const snapshot = snapshotConversationMessages(
    [
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Stable reply' },
    ],
    'Streaming partial reply',
  );

  assert.deepEqual(snapshot, [
    { role: 'user', content: 'Question' },
    { role: 'assistant', content: 'Stable reply' },
    { role: 'assistant', content: 'Streaming partial reply' },
  ]);
});
