import assert from 'node:assert/strict';
import test from 'node:test';

import { renderMarkdown } from '../src/markdown.js';

test('renderMarkdown turns reply fences into actionable reply blocks', () => {
  const html = renderMarkdown('```reply to=#25\n引用 "原文" <b>谢谢</b>\n第二行\n```');

  assert.match(html, /class="reply-block"/);
  assert.match(html, /data-reply-to="25"/);
  assert.match(html, /class="reply-body">引用 "原文" &lt;b&gt;谢谢&lt;\/b&gt;<br>第二行<\/div>/);
  assert.match(html, /data-raw="引用 &quot;原文&quot; &lt;b&gt;谢谢&lt;\/b&gt;\n第二行"/);
  assert.match(html, /class="reply-post-btn">Post<\/button>/);
  assert.match(html, /replying to #25/);
});
