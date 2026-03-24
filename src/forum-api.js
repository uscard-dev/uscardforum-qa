import { forumGet } from './http.js';

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
  const params = {
    post_number: post_number || 1,
    asc: 'true',
    include_suggested: 'false',
  };
  const data = await forumGet(`/t/topic/${topic_id}.json`, params);
  if (isError(data)) return data;
  return (data.post_stream?.posts || []).map((p) => ({
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
    username: u.username,
    name: u.name,
    trust_level: u.trust_level,
    unread_notifications: u.unread_notifications,
    unread_high_priority_notifications: u.unread_high_priority_notifications,
    unread_private_messages: u.unread_private_messages,
    all_unread_notifications_count: u.all_unread_notifications_count,
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

