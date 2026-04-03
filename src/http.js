const FORUM_BASE = 'https://www.uscardforum.com';

export async function forumGet(path, params = {}) {
  const url = new URL(path, FORUM_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { _httpError: res.status, url: url.toString() };
  return res.json();
}

export async function forumPost(path, body = {}) {
  const url = new URL(path, FORUM_BASE);
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(url.toString(), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) return { _httpError: res.status, url: url.toString() };
  return res.json();
}
