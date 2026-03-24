const TOOL_META = {
  search_forum: {
    icon: '🔍',
    iconClass: 'search',
    label: 'Searching forum',
    argKey: 'query',
  },
  get_hot_topics: {
    icon: '🔥',
    iconClass: 'browse',
    label: 'Fetching hot topics',
  },
  get_new_topics: {
    icon: '🆕',
    iconClass: 'browse',
    label: 'Fetching latest topics',
  },
  get_top_topics: {
    icon: '🏆',
    iconClass: 'browse',
    label: 'Fetching top topics',
    argKey: 'period',
  },
  get_topic_posts: {
    icon: '📖',
    iconClass: 'browse',
    label: 'Reading topic',
    argKey: 'topic_id',
  },
  get_categories: {
    icon: '📂',
    iconClass: 'list',
    label: 'Fetching categories',
  },
  get_user_summary: {
    icon: '👤',
    iconClass: 'user',
    label: 'Looking up user',
    argKey: 'username',
  },
  get_user_topics: {
    icon: '📝',
    iconClass: 'user',
    label: 'Fetching user topics',
    argKey: 'username',
  },
  get_user_replies: {
    icon: '💬',
    iconClass: 'user',
    label: 'Fetching user replies',
    argKey: 'username',
  },
  get_user_actions: {
    icon: '📊',
    iconClass: 'user',
    label: 'Fetching user activity',
    argKey: 'username',
  },
  get_user_profile: {
    icon: '📋',
    iconClass: 'user',
    label: 'Fetching user profile',
    argKey: 'username',
  },
  get_current_user: {
    icon: '🔑',
    iconClass: 'user',
    label: 'Getting current user',
  },
  get_notifications: {
    icon: '🔔',
    iconClass: 'list',
    label: 'Fetching notifications',
  },
};

export function describeToolCall(name, args) {
  const meta = TOOL_META[name] || { icon: '⚙', iconClass: 'list', label: name };
  const argVal = meta.argKey && args?.[meta.argKey];

  let title = meta.label;
  let subtitle = '';

  if (name === 'search_forum') {
    title = `Searching "${args?.query || ''}"`;
    const parts = [];
    if (args?.order) parts.push(`sorted by ${args.order}`);
    if (args?.page) parts.push(`page ${args.page}`);
    subtitle = parts.join(', ') || 'full-text search';
  } else if (name === 'get_topic_posts') {
    title = `Reading topic #${args?.topic_id || '?'}`;
    subtitle = args?.post_number ? `from post ${args.post_number}` : 'from the beginning';
  } else if (name === 'get_top_topics') {
    title = `Fetching top topics`;
    subtitle = args?.period || 'monthly';
  } else if (name === 'get_user_summary') {
    title = `Looking up @${args?.username || '?'}`;
    subtitle = 'profile summary';
  } else if (name === 'get_user_topics') {
    title = `Topics by @${args?.username || '?'}`;
    subtitle = args?.page ? `page ${args.page}` : 'first page';
  } else if (name === 'get_user_replies') {
    title = `Replies by @${args?.username || '?'}`;
    subtitle = args?.offset ? `offset ${args.offset}` : 'latest';
  } else if (name === 'get_user_actions') {
    title = `Activity for @${args?.username || '?'}`;
    subtitle = args?.filter ? `filter: ${args.filter}` : 'all activity';
  } else if (name === 'get_user_profile') {
    title = `Profile of @${args?.username || '?'}`;
    subtitle = 'detailed stats & badges';
  } else if (name === 'get_current_user') {
    title = 'Getting current user';
    subtitle = 'session info';
  } else if (name === 'get_notifications') {
    title = 'Fetching notifications';
    subtitle = args?.limit ? `latest ${args.limit}` : 'all recent';
  } else if (argVal) {
    subtitle = String(argVal);
  }

  return { icon: meta.icon, iconClass: meta.iconClass, title, subtitle };
}

export function summarizeToolResult(name, result) {
  if (!result) return 'no data';
  if (result._httpError) return `HTTP ${result._httpError} error`;

  if (name === 'search_forum') {
    const posts = result.posts?.length || 0;
    const topics = result.topics?.length || 0;
    return `${posts} posts, ${topics} topics found`;
  }

  if (name === 'get_categories') {
    return `${Array.isArray(result) ? result.length : 0} categories`;
  }

  if (name === 'get_topic_posts') {
    const count = Array.isArray(result) ? result.length : 0;
    return `${count} posts loaded`;
  }

  if (name === 'get_user_summary') {
    const stats = result.stats || {};
    return `${stats.post_count || 0} posts, ${stats.likes_received || 0} likes`;
  }

  if (name === 'get_current_user') {
    return result.username ? `@${result.username}` : 'not logged in';
  }

  if (name === 'get_notifications') {
    return `${Array.isArray(result) ? result.length : 0} notifications`;
  }

  if (Array.isArray(result)) {
    return `${result.length} results`;
  }

  if (name.startsWith('get_hot') || name.startsWith('get_new') || name.startsWith('get_top')) {
    return `${Array.isArray(result) ? result.length : 0} topics`;
  }

  return 'done';
}
