import assert from 'node:assert/strict';
import test from 'node:test';

import { getTopicPosts } from '../src/forum-api.js';

function makeJsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return data;
    },
  };
}

function makePost(postNumber) {
  return {
    id: postNumber,
    post_number: postNumber,
    username: `user${postNumber}`,
    cooked: `<p>post ${postNumber}</p>`,
    created_at: '2026-01-01T00:00:00.000Z',
    like_count: 0,
    reply_count: 0,
    reply_to_post_number: null,
  };
}

test('getTopicPosts reads a non-overlapping window from the requested starting post', async () => {
  const originalFetch = global.fetch;
  const requestedUrls = [];
  const stream = Array.from({ length: 128 }, (_, index) => index + 1);

  global.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);

    const parsed = new URL(url);
    if (parsed.pathname === '/t/topic/42.json') {
      return makeJsonResponse({
        post_stream: {
          posts: Array.from({ length: 20 }, (_, index) => makePost(96 + index)),
          stream,
        },
      });
    }

    if (parsed.pathname === '/t/42/posts.json') {
      const ids = parsed.searchParams.getAll('post_ids[]').map(Number);
      return makeJsonResponse({
        post_stream: {
          posts: ids.map(makePost),
        },
      });
    }

    throw new Error(`Unexpected URL ${url}`);
  };

  try {
    const posts = await getTopicPosts({ topic_id: 42, post_number: 101 });

    assert.deepEqual(
      posts.map((post) => post.post_number),
      Array.from({ length: 28 }, (_, index) => 101 + index),
    );

    const extraFetches = requestedUrls.filter((url) => url.includes('/t/42/posts.json'));
    assert.ok(extraFetches.length > 0, 'expected follow-up post batch fetches');
    for (const url of extraFetches) {
      const ids = new URL(url).searchParams.getAll('post_ids[]').map(Number);
      assert.ok(ids.every((id) => id >= 101), `unexpected early post ids in ${url}`);
    }
  } finally {
    global.fetch = originalFetch;
  }
});
