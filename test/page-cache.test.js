import assert from 'node:assert/strict';
import test from 'node:test';

import { getPageCacheKey } from '../src/page-cache.js';

test('getPageCacheKey canonicalizes topic URLs to the topic root', () => {
  assert.equal(
    getPageCacheKey('https://www.uscardforum.com/t/topic/496312/58'),
    'https://www.uscardforum.com/t/topic/496312/',
  );
});
