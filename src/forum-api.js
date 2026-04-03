import { forumGet, forumPost } from './http.js';

function isError(data) {
  return data && data._httpError;
}

function extractTopics(payload) {
  if (isError(payload)) return payload;
  return (payload.topic_list?.topics || []).map((t) => ({
    id: t.id,
    title: t.title,
    posts_count: t.posts_count,
    views: t.views,
    like_count: t.like_count,
    created_at: t.created_at,
    last_posted_at: t.last_posted_at,
    category_id: t.category_id,
  }));
}

export async function searchForum({ query, page, order }) {
  let q = query;
  if (order && !q.includes('order:')) q = `${q} order:${order}`;
  const params = { q };
  if (page) params.page = page;
  const data = await forumGet('/search.json', params);
  if (isError(data)) return data;
  return {
    posts: (data.posts || []).map((p) => ({
      id: p.id,
      topic_id: p.topic_id,
      username: p.username,
      blurb: p.blurb,
      created_at: p.created_at,
      like_count: p.like_count,
    })),
    topics: (data.topics || []).map((t) => ({
      id: t.id,
      title: t.title,
      posts_count: t.posts_count,
      category_id: t.category_id,
    })),
  };
}

export async function getHotTopics({ page }) {
  const params = {};
  if (page !== undefined) params.page = page;
  return extractTopics(await forumGet('/hot.json', params));
}

export async function getNewTopics({ page }) {
  const params = {};
  if (page !== undefined) params.page = page;
  return extractTopics(await forumGet('/latest.json', params));
}

export async function getTopTopics({ period, page }) {
  const params = { period: period || 'monthly' };
  if (page !== undefined) params.page = page;
  return extractTopics(await forumGet('/top.json', params));
}

export async function getTopicPosts({ topic_id, post_number }) {
  const startNum = post_number || 1;
  const data = await forumGet(`/t/topic/${topic_id}.json`, {
    post_number: startNum,
    asc: 'true',
    include_suggested: 'false',
  });
  if (isError(data)) return data;

  const initialPosts = data.post_stream?.posts || [];
  const stream = data.post_stream?.stream || [];

  // post_number can have gaps when posts are deleted, so find our place in
  // the topic stream using the first returned post at or after startNum.
  let startIndex = 0;
  const anchor = initialPosts.find((p) => p.post_number >= startNum);
  if (anchor) {
    const anchorIdx = stream.indexOf(anchor.id);
    if (anchorIdx >= 0) startIndex = anchorIdx;
  } else if (startNum > 1) {
    startIndex = Math.min(stream.length, startNum - 1);
  }

  const targetIds = stream.slice(startIndex, startIndex + 100);
  if (targetIds.length === 0) return [];

  const targetIdSet = new Set(targetIds);
  const filteredInitialPosts = initialPosts.filter((p) => targetIdSet.has(p.id));
  const loadedIds = new Set(filteredInitialPosts.map((p) => p.id));
  const remaining = targetIds.filter((id) => !loadedIds.has(id));

  // Fetch any missing posts in the requested window via post_ids endpoint.
  const extraPosts = [];
  if (remaining.length > 0) {
    const chunkSize = 20;
    const chunks = [];
    for (let j = 0; j < remaining.length; j += chunkSize) {
      chunks.push(remaining.slice(j, j + chunkSize));
    }
    const results = await Promise.all(
      chunks.map((ids) => {
        const url = `/t/${topic_id}/posts.json?${ids.map((id) => `post_ids[]=${id}`).join('&')}`;
        return forumGet(url);
      }),
    );
    for (const r of results) {
      if (!isError(r) && r.post_stream?.posts) {
        extraPosts.push(...r.post_stream.posts);
      }
    }
  }

  const allPosts = [...filteredInitialPosts, ...extraPosts];
  // Deduplicate and sort by post_number
  const seen = new Set();
  const unique = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  unique.sort((a, b) => a.post_number - b.post_number);

  return unique.map((p) => ({
    post_number: p.post_number,
    username: p.username,
    cooked: p.cooked,
    created_at: p.created_at,
    like_count: p.like_count,
    reply_count: p.reply_count,
    reply_to_post_number: p.reply_to_post_number,
  }));
}

export async function getCategories() {
  const data = await forumGet('/categories.json');
  if (isError(data)) return data;
  const cats = [];
  for (const c of data.category_list?.categories || []) {
    cats.push({ id: c.id, name: c.name, slug: c.slug, topic_count: c.topic_count });
    for (const sub of c.subcategory_list || c.subcategories || []) {
      cats.push({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        topic_count: sub.topic_count,
        parent_category_id: c.id,
      });
    }
  }
  return cats;
}

export async function getUserSummary({ username }) {
  const data = await forumGet(`/u/${username}/summary.json`);
  if (isError(data)) return data;
  const s = data.user_summary || {};
  const user = data.users?.[0] || {};
  return {
    username: user.username || username,
    stats: {
      likes_given: s.likes_given,
      likes_received: s.likes_received,
      days_visited: s.days_visited,
      post_count: s.post_count,
      topic_count: s.topic_count,
      posts_read_count: s.posts_read_count,
      topics_entered: s.topics_entered,
    },
    top_topics: s.top_topics || [],
    top_replies: s.top_replies || [],
  };
}

export async function getUserTopics({ username, page }) {
  const params = {};
  if (page !== undefined) params.page = page;
  const data = await forumGet(`/topics/created-by/${username}.json`, params);
  return extractTopics(data);
}

export async function getUserReplies({ username, offset }) {
  return getUserActions({ username, filter: 5, offset });
}

export async function getUserActions({ username, filter, offset }) {
  const params = { username };
  if (filter !== undefined) params.filter = filter;
  if (offset !== undefined) params.offset = offset;
  const data = await forumGet('/user_actions.json', params);
  if (isError(data)) return data;
  return (data.user_actions || []).map((a) => ({
    topic_id: a.topic_id,
    post_number: a.post_number,
    title: a.title,
    excerpt: a.excerpt,
    created_at: a.created_at,
    action_type: a.action_type,
    username: a.username,
  }));
}

export async function getCurrentUser() {
  const data = await forumGet('/session/current.json');
  if (isError(data)) return data;
  const u = data.current_user || {};
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    admin: u.admin,
    moderator: u.moderator,
    trust_level: u.trust_level,
    title: u.title,
    unread_notifications: u.unread_notifications,
    unread_high_priority_notifications: u.unread_high_priority_notifications,
    all_unread_notifications_count: u.all_unread_notifications_count,
    new_personal_messages_notifications_count: u.new_personal_messages_notifications_count,
    can_send_private_messages: u.can_send_private_messages,
    can_create_topic: u.can_create_topic,
    groups: (u.groups || []).map((g) => g.name),
    muted_category_ids: u.muted_category_ids,
    watched_category_ids: u.watched_category_ids,
    tracked_category_ids: u.tracked_category_ids,
    sidebar_category_ids: u.sidebar_category_ids,
    muted_tags: (u.muted_tags || []).map((t) => t.name),
    watched_tags: u.watched_tags,
    previous_visit_at: u.previous_visit_at,
    draft_count: u.draft_count,
    pending_posts_count: u.pending_posts_count,
    votes_left: u.votes_left,
    vote_limit: u.vote_limit,
    timezone: u.user_option?.timezone,
    hide_profile: u.user_option?.hide_profile,
  };
}

export async function getUserProfile({ username }) {
  const data = await forumGet(`/u/${username}.json`);
  if (isError(data)) return data;
  const u = data.user || {};
  const s = u.user_stat || {};
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    title: u.title,
    bio_raw: u.bio_raw || '',
    trust_level: u.trust_level,
    admin: u.admin,
    moderator: u.moderator,
    created_at: u.created_at,
    last_seen_at: u.last_seen_at,
    last_posted_at: u.last_posted_at,
    stats: {
      days_visited: s.days_visited,
      time_read: s.time_read,
      posts_read_count: s.posts_read_count,
      topics_entered: s.topics_entered,
      topic_count: s.topic_count,
      post_count: s.post_count,
      likes_given: s.likes_given,
      likes_received: s.likes_received,
    },
    badges: (u.badges || []).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      badge_type_id: b.badge_type_id,
      grant_count: b.grant_count,
    })),
    groups: (u.groups || []).map((g) => ({ id: g.id, name: g.name })),
  };
}

export async function createPost({ topic_id, raw, reply_to_post_number }) {
  const body = { topic_id, raw };
  if (reply_to_post_number) body.reply_to_post_number = reply_to_post_number;

  const data = await forumPost('/posts.json', body);
  if (isError(data)) return data;

  return {
    id: data.id,
    post_number: data.post_number,
    topic_id: data.topic_id,
    username: data.username,
    created_at: data.created_at,
  };
}

export async function getNotifications({ limit }) {
  const data = await forumGet('/notifications.json');
  if (isError(data)) return data;
  let notifications = (data.notifications || []).map((n) => ({
    id: n.id,
    type: n.notification_type,
    read: n.read,
    created_at: n.created_at,
    topic_id: n.topic_id,
    post_number: n.post_number,
    slug: n.slug,
    data: n.data,
  }));
  if (limit) notifications = notifications.slice(0, limit);
  return notifications;
}
