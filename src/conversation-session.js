export function beginConversationTurn({
  currentConvoId,
  currentConvoTitle,
  conversationMessages,
  prompt,
  newConversationId,
  persistConversation,
}) {
  let nextConvoId = currentConvoId;
  let nextConvoTitle = currentConvoTitle;

  if (!nextConvoId) {
    nextConvoId = newConversationId();
    nextConvoTitle = prompt.slice(0, 80);
  }

  const nextMessages = [...conversationMessages, { role: 'user', content: prompt }];
  persistConversation({
    id: nextConvoId,
    title: nextConvoTitle,
    messages: nextMessages,
  });

  return {
    currentConvoId: nextConvoId,
    currentConvoTitle: nextConvoTitle,
    conversationMessages: nextMessages,
  };
}

export function snapshotConversationMessages(conversationMessages, inFlightAssistantText) {
  if (!inFlightAssistantText) return conversationMessages;
  return [...conversationMessages, { role: 'assistant', content: inFlightAssistantText }];
}
