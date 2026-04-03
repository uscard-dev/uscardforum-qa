const TOPIC_PATH_RE = /^\/t\/[^/]+\/(\d+)(?:\/\d+)?\/?$/;

export function getPageCacheKey(rawUrl) {
  const url = new URL(rawUrl);
  const topicMatch = url.pathname.match(TOPIC_PATH_RE);
  if (topicMatch) {
    return `${url.origin}/t/topic/${topicMatch[1]}/`;
  }

  return `${url.origin}${url.pathname}`;
}
