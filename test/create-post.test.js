import assert from 'node:assert/strict';
import test from 'node:test';

import { createPost } from '../src/forum-api.js';

function makeJsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return data;
    },
  };
}

test('createPost sends an authenticated forum post request and normalizes the response', async () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  const requests = [];

  global.document = {
    querySelector(selector) {
      assert.equal(selector, 'meta[name="csrf-token"]');
      return { content: 'csrf-token-123' };
    },
  };

  global.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return makeJsonResponse({
      id: 9001,
      post_number: 27,
      topic_id: 42,
      username: 'tester',
      created_at: '2026-04-03T20:00:00.000Z',
    });
  };

  try {
    const result = await createPost({
      topic_id: 42,
      raw: '引用 "原文" <b>谢谢</b>',
      reply_to_post_number: 3,
    });

    assert.deepEqual(result, {
      id: 9001,
      post_number: 27,
      topic_id: 42,
      username: 'tester',
      created_at: '2026-04-03T20:00:00.000Z',
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://www.uscardforum.com/posts.json');
    assert.equal(requests[0].init.method, 'POST');
    assert.equal(requests[0].init.credentials, 'include');
    assert.equal(requests[0].init.headers.Accept, 'application/json');
    assert.equal(requests[0].init.headers['Content-Type'], 'application/json');
    assert.equal(requests[0].init.headers['X-CSRF-Token'], 'csrf-token-123');
    assert.deepEqual(JSON.parse(requests[0].init.body), {
      topic_id: 42,
      raw: '引用 "原文" <b>谢谢</b>',
      reply_to_post_number: 3,
    });
  } finally {
    global.fetch = originalFetch;
    global.document = originalDocument;
  }
});
