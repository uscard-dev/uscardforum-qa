export function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.replace(/<br\s*\/?>/gi, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      if (lang.startsWith('reply')) {
        const raw = codeLines.join('\n');
        const replyTo = lang.match(/(?:^|\s)to=#(\d+)/)?.[1] || '';
        const replyLabel = replyTo
          ? `<span class="reply-to">replying to #${esc(replyTo)}</span>`
          : '';
        const replyBody = codeLines.map((codeLine) => esc(codeLine)).join('<br>');
        blocks.push(
          `<div class="reply-block" data-raw="${escAttr(raw)}"${replyTo ? ` data-reply-to="${escAttr(replyTo)}"` : ''}>`
          + `<div class="reply-body">${replyBody}</div>`
          + `<div class="reply-footer">${replyLabel}<button class="reply-post-btn">Post</button></div>`
          + '</div>',
        );
      } else {
        blocks.push(`<pre><code class="lang-${esc(lang || 'text')}">${esc(codeLines.join('\n'))}</code></pre>`);
      }
      continue;
    }

    if (/^\|.+\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1]?.trim())) {
      const headerCells = parseTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      let t = '<table><thead><tr>';
      for (const c of headerCells) t += `<th>${inline(c)}</th>`;
      t += '</tr></thead><tbody>';
      for (const row of rows) {
        t += '<tr>';
        for (const c of row) t += `<td>${inline(c)}</td>`;
        t += '</tr>';
      }
      t += '</tbody></table>';
      blocks.push(t);
      continue;
    }

    if (/^#{1,3} /.test(line)) {
      const m = line.match(/^(#{1,3})\s*(.*)$/);
      const tag = `h${m[1].length}`;
      blocks.push(`<${tag}>${inline(m[2] || '')}</${tag}>`);
      i++;
      continue;
    }

    if (/^&gt; |^> /.test(line)) {
      const qLines = [];
      while (i < lines.length && /^(&gt; |> )/.test(lines[i])) {
        qLines.push(lines[i].replace(/^(&gt; |> )/, ''));
        i++;
      }
      blocks.push(`<blockquote>${qLines.map(l => inline(l)).join('<br>')}</blockquote>`);
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      blocks.push('<ul>' + items.map(t => `<li>${inline(t)}</li>`).join('') + '</ul>');
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      blocks.push('<ol>' + items.map(t => `<li>${inline(t)}</li>`).join('') + '</ol>');
      continue;
    }

    if (line.trim() === '---' || line.trim() === '***') {
      blocks.push('<hr>');
      i++;
      continue;
    }

    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' &&
           !/^```/.test(lines[i]) && !/^#{1,3} /.test(lines[i]) &&
           !/^[-*] /.test(lines[i]) && !/^\d+\. /.test(lines[i]) &&
           !/^\|.+\|/.test(lines[i]) && !/^(&gt; |> )/.test(lines[i]) &&
           lines[i].trim() !== '---' && lines[i].trim() !== '***') {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(`<p>${paraLines.map(l => inline(l)).join('<br>')}</p>`);
  }

  return blocks.join('\n');
}

function parseTableRow(line) {
  return line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  return s;
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(str) {
  return esc(str)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
