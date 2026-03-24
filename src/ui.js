import { renderMarkdown } from './markdown.js';
import { describeToolCall, summarizeToolResult } from './tool-labels.js';

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const CSS = `
*,*::before,*::after{box-sizing:border-box}

:host{
  all:initial;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  font-size:13px;
  color:#c8ccd4;
  line-height:1.5;
}

/* ── toggle ── */
.toggle{
  position:fixed;bottom:20px;right:20px;
  width:52px;height:52px;border-radius:16px;
  background:linear-gradient(135deg,#0ea5e9,#8b5cf6,#ec4899);
  background-size:200% 200%;
  animation:gshift 4s ease infinite;
  color:#fff;border:none;cursor:pointer;
  box-shadow:0 0 20px rgba(139,92,246,.35),0 4px 16px rgba(0,0,0,.3);
  z-index:2147483647;
  display:flex;align-items:center;justify-content:center;font-size:22px;
  transition:transform .25s cubic-bezier(.4,0,.2,1),box-shadow .25s;
}
.toggle:hover{
  transform:translateY(-3px) scale(1.05);
  box-shadow:0 0 30px rgba(139,92,246,.5),0 8px 24px rgba(0,0,0,.4);
}
@keyframes gshift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

/* ── panel shell ── */
.panel{
  position:fixed;bottom:84px;right:20px;
  width:460px;height:640px;
  background:#0c0c10;
  border-radius:20px;
  border:1px solid rgba(139,92,246,.2);
  box-shadow:0 0 40px rgba(139,92,246,.08),0 20px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.03);
  display:none;flex-direction:column;
  z-index:2147483646;overflow:hidden;
}
.panel.open{display:flex}

/* ── header ── */
.hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 16px;
  background:linear-gradient(180deg,rgba(139,92,246,.08),transparent);
  border-bottom:1px solid rgba(255,255,255,.06);
  flex:0 0 auto;
}
.hdr-title{font-weight:700;font-size:13.5px;color:#f0f0f5;display:flex;align-items:center;gap:8px}
.hdr-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,.5);animation:pdot 2s ease-in-out infinite}
@keyframes pdot{0%,100%{box-shadow:0 0 6px rgba(34,197,94,.4)}50%{box-shadow:0 0 12px rgba(34,197,94,.7)}}
.hdr-actions{display:flex;gap:6px}
.hdr-actions button{
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
  color:#71717a;cursor:pointer;border-radius:8px;padding:4px 10px;
  font-size:11px;font-family:inherit;font-weight:500;transition:all .2s;
}
.hdr-actions button:hover{background:rgba(139,92,246,.1);color:#c4b5fd;border-color:rgba(139,92,246,.3)}

/* ── settings ── */
.settings{display:none;padding:12px 16px;background:rgba(139,92,246,.03);border-bottom:1px solid rgba(255,255,255,.05);flex:0 0 auto}
.settings.open{display:block}
.settings label{display:block;font-size:10px;font-weight:700;color:#52525b;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px}
.settings input,.settings select{
  width:100%;padding:8px 10px;border:1px solid rgba(255,255,255,.08);border-radius:8px;
  font-size:12px;margin-bottom:10px;background:rgba(255,255,255,.03);color:#c8ccd4;
  font-family:'SF Mono','Fira Code',monospace;appearance:none;
}
.settings select{cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M3 5l3 3 3-3'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.settings select option{background:#1a1a22;color:#c8ccd4}
.settings input:focus,.settings select:focus{outline:none;border-color:rgba(139,92,246,.5);box-shadow:0 0 10px rgba(139,92,246,.1)}
.settings .row-base-url{display:none}
.settings.show-base-url .row-base-url{display:block}

/* ── history panel ── */
.history{display:none;flex:1 1 0;overflow-y:auto;padding:8px 10px;scrollbar-width:thin;scrollbar-color:rgba(139,92,246,.2) transparent}
.history.open{display:block}
.history.open ~ .msgs{display:none}
.history.open ~ .status{display:none}
.history.open ~ .input-area{display:none}
.history-empty{color:#3f3f46;font-size:12px;text-align:center;padding:32px 0}
.history-item{
  display:flex;align-items:center;gap:8px;
  padding:9px 12px;border-radius:10px;cursor:pointer;
  transition:background .15s;margin-bottom:2px;
}
.history-item:hover{background:rgba(139,92,246,.08)}
.history-item-body{flex:1;min-width:0}
.history-item-title{color:#c8ccd4;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.history-item-date{color:#3f3f46;font-size:10px;font-family:'SF Mono','Fira Code',monospace;margin-top:1px}
.history-item-del{
  flex:0 0 auto;opacity:0;color:#71717a;font-size:14px;cursor:pointer;
  padding:2px 4px;border-radius:4px;transition:opacity .15s,color .15s;
}
.history-item:hover .history-item-del{opacity:1}
.history-item-del:hover{color:#f87171}

/* ── scroll area ── */
.msgs{
  flex:1 1 0;
  overflow-y:auto;
  padding:12px 14px;
  scrollbar-width:thin;
  scrollbar-color:rgba(139,92,246,.2) transparent;
}

/* ── items: every child is a block that never shrinks ── */
.msgs > *{
  display:block;
  margin-bottom:8px;
}
.msgs > *:last-child{margin-bottom:0}

/* ── user bubble ── */
.msg-user-wrap{
  text-align:right;
}
.msg-user{
  display:inline-block;
  text-align:left;
  max-width:88%;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff;padding:8px 14px;
  border-radius:14px 14px 4px 14px;
  font-size:13px;
  box-shadow:0 2px 12px rgba(99,102,241,.25);
  word-wrap:break-word;
}

/* ── assistant text ── */
.msg-ai{
  max-width:95%;
  color:#bfc4cc;
  font-size:13px;
  line-height:1.5;
  word-wrap:break-word;
}
.msg-ai h1,.msg-ai h2,.msg-ai h3{color:#e8e8ed;margin:6px 0 2px;font-size:13.5px}
.msg-ai h1{font-size:15px}
.msg-ai pre{
  background:#08080a;color:#a5b4fc;padding:10px;border-radius:8px;
  border:1px solid rgba(139,92,246,.12);overflow-x:auto;
  font-size:11.5px;margin:4px 0;font-family:'SF Mono','Fira Code',monospace;
}
.msg-ai code{background:rgba(139,92,246,.1);padding:1px 5px;border-radius:4px;font-size:11.5px;color:#c4b5fd;font-family:'SF Mono','Fira Code',monospace}
.msg-ai pre code{background:none;padding:0;color:#a5b4fc}
.msg-ai a{color:#818cf8;text-decoration:underline;text-underline-offset:2px}
.msg-ai ul,.msg-ai ol{margin:2px 0;padding-left:18px}
.msg-ai li{margin:1px 0}
.msg-ai blockquote{border-left:2px solid rgba(139,92,246,.4);margin:4px 0;padding:2px 12px;color:#71717a}
.msg-ai p{margin:4px 0}
.msg-ai strong{color:#e8e8ed}
.msg-ai hr{border:none;border-top:1px solid rgba(255,255,255,.08);margin:8px 0}
.msg-ai table{border-collapse:collapse;width:100%;margin:6px 0;font-size:12px}
.msg-ai th,.msg-ai td{border:1px solid rgba(255,255,255,.1);padding:5px 8px;text-align:left}
.msg-ai th{background:rgba(139,92,246,.08);color:#e8e8ed;font-weight:600;font-size:11.5px}
.msg-ai td{color:#a1a1aa}

/* ── error ── */
.msg-err{
  background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);
  color:#fca5a5;font-size:12px;text-align:center;padding:8px 14px;border-radius:10px;
}

/* ── tool card ── */
.tool{
  background:#15151a;border:1px solid #252530;border-radius:10px;
  transition:border-color .3s;
}
.tool.running{border-color:rgba(139,92,246,.35)}
.tool.done{border-color:rgba(74,222,128,.25)}
.tool-hdr{
  display:flex;align-items:center;gap:8px;
  padding:7px 10px;cursor:pointer;user-select:none;transition:background .15s;
}
.tool-hdr:hover{background:#1a1a22}
.tool-ico{
  width:26px;height:26px;border-radius:7px;
  display:flex;align-items:center;justify-content:center;font-size:13px;flex:0 0 26px;
}
.tool-ico.search{background:rgba(14,165,233,.15)}
.tool-ico.browse{background:rgba(234,179,8,.12)}
.tool-ico.user{background:rgba(168,85,247,.15)}
.tool-ico.list{background:rgba(34,197,94,.12)}
.tool-body{flex:1;min-width:0}
.tool-title{color:#c8ccd4;font-weight:500;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tool-sub{color:#71717a;font-size:10.5px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'SF Mono','Fira Code',monospace}
.tool-st{flex:0 0 18px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px}
.tool-st.running .sp{width:12px;height:12px;border:2px solid rgba(139,92,246,.2);border-top-color:#8b5cf6;border-radius:50%;animation:spin .7s linear infinite}
.tool-st.done{color:#4ade80;text-shadow:0 0 6px rgba(74,222,128,.4)}
.tool-st.error{color:#f87171}
.tool-detail{display:none;padding:0 10px 8px;max-height:180px;overflow:auto}
.tool-detail.open{display:block}
.tool-detail pre{margin:0;white-space:pre-wrap;word-break:break-all;font-family:'SF Mono','Fira Code',monospace;font-size:10.5px;line-height:1.4;color:#71717a}

/* ── reasoning ── */
.reason{
  background:#12121a;border:1px solid rgba(139,92,246,.15);border-radius:10px;
}
.reason-hdr{
  display:flex;align-items:center;gap:6px;
  padding:6px 10px;cursor:pointer;user-select:none;
  color:#71717a;font-size:11px;font-weight:500;transition:color .15s;
}
.reason-hdr:hover{color:#a1a1aa}
.reason-arrow{font-size:9px;transition:transform .2s;display:inline-block}
.reason.open .reason-arrow{transform:rotate(90deg)}
.reason-hdr .sp{width:11px;height:11px;border:1.5px solid rgba(139,92,246,.2);border-top-color:#8b5cf6;border-radius:50%;animation:spin .7s linear infinite}
.reason-body{display:none;padding:0 10px 8px;color:#52525b;font-size:11px;line-height:1.4;max-height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-word}
.reason.open .reason-body{display:block}

/* ── thinking indicator ── */
.thinking{
  display:flex;align-items:center;gap:8px;padding:4px 0;
  color:#52525b;font-size:11px;
}
.thinking .sp{width:14px;height:14px;border:2px solid rgba(139,92,246,.15);border-top-color:#8b5cf6;border-radius:50%;animation:spin .7s linear infinite}

@keyframes spin{to{transform:rotate(360deg)}}

/* ── status bar ── */
.status{
  padding:6px 16px;font-size:10px;color:#3f3f46;text-align:center;
  flex:0 0 auto;
  border-top:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.01);
  font-family:'SF Mono','Fira Code',monospace;letter-spacing:.5px;
}

/* ── input ── */
.input-area{
  display:flex;align-items:flex-end;padding:10px 12px;gap:8px;
  border-top:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);
  flex:0 0 auto;
}
.input-area textarea{
  flex:1;resize:none;
  border:1px solid rgba(255,255,255,.08);border-radius:10px;
  padding:9px 12px;font-size:13px;font-family:inherit;
  max-height:100px;min-height:22px;line-height:1.4;
  background:rgba(255,255,255,.03);color:#d4d4d8;
  transition:border-color .2s,box-shadow .2s;
}
.input-area textarea::placeholder{color:#3f3f46}
.input-area textarea:focus{outline:none;border-color:rgba(139,92,246,.4);box-shadow:0 0 14px rgba(139,92,246,.08)}
.input-area textarea:disabled{opacity:.3;cursor:not-allowed}
.btn-send{
  background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;
  border-radius:10px;padding:9px 18px;cursor:pointer;
  font-size:12.5px;font-weight:600;font-family:inherit;
  transition:all .2s;white-space:nowrap;
  box-shadow:0 2px 10px rgba(99,102,241,.2);
}
.btn-send:hover{box-shadow:0 4px 18px rgba(99,102,241,.35);transform:translateY(-1px)}
.btn-send:disabled{background:rgba(255,255,255,.05);color:#3f3f46;cursor:default;box-shadow:none;transform:none}
.btn-send.stop{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 2px 10px rgba(239,68,68,.25)}
.btn-send.stop:hover{box-shadow:0 4px 18px rgba(239,68,68,.4)}
`;

const HTML = `
<button class="toggle" title="QA Bot">✦</button>
<div class="panel">
  <div class="hdr">
    <div class="hdr-title"><span class="hdr-dot"></span> USCardForum QA</div>
    <div class="hdr-actions">
      <button class="btn-history">History</button>
      <button class="btn-settings">Settings</button>
      <button class="btn-new">+ New</button>
    </div>
  </div>
  <div class="settings">
    <label>Provider</label>
    <select class="in-provider">
      <option value="gemini">Gemini API</option>
      <option value="litellm">LiteLLM (Gemini-compatible)</option>
    </select>
    <label>API Key</label>
    <input type="password" class="in-key" placeholder="API Key">
    <label>Model</label>
    <input type="text" class="in-model" placeholder="gemini-3.1-pro-preview">
    <div class="row-base-url">
      <label>Base URL</label>
      <input type="text" class="in-base-url" placeholder="https://your-litellm-server/v1">
    </div>
  </div>
  <div class="history"></div>
  <div class="msgs"></div>
  <div class="status"></div>
  <div class="input-area">
    <textarea class="in-text" rows="1" placeholder="Ask anything about USCardForum..."></textarea>
    <button class="btn-send">Send</button>
  </div>
</div>
`;

export function createUI() {
  const host = document.createElement('div');
  host.id = 'qabot-root';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = CSS;
  shadow.appendChild(style);

  const wrap = document.createElement('div');
  wrap.innerHTML = HTML;
  shadow.appendChild(wrap);
  document.body.appendChild(host);

  const $ = (s) => shadow.querySelector(s);
  const panel = $('.panel');
  const settingsEl = $('.settings');
  const providerEl = $('.in-provider');
  const historyEl = $('.history');
  const msgs = $('.msgs');
  const statusEl = $('.status');
  const inputEl = $('.in-text');
  const sendBtn = $('.btn-send');

  function syncProviderUI() {
    if (providerEl.value === 'litellm') {
      settingsEl.classList.add('show-base-url');
    } else {
      settingsEl.classList.remove('show-base-url');
    }
  }
  providerEl.addEventListener('change', syncProviderUI);

  $('.toggle').addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) requestAnimationFrame(() => inputEl.focus());
  });
  $('.btn-settings').addEventListener('click', () => settingsEl.classList.toggle('open'));

  let _onHistoryOpen = null;
  $('.btn-history').addEventListener('click', () => {
    const opening = !historyEl.classList.contains('open');
    historyEl.classList.toggle('open');
    if (opening && _onHistoryOpen) _onHistoryOpen();
  });

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  let userScrolledUp = false;

  msgs.addEventListener('scroll', () => {
    const distFromBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight;
    userScrolledUp = distFromBottom > 40;
  });

  function scroll() {
    if (userScrolledUp) return;
    requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
  }

  function el(cls, html) {
    const d = document.createElement('div');
    d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    return d;
  }

  function append(node) {
    msgs.appendChild(node);
    scroll();
    return node;
  }

  // ── public API ──

  function addMessage(role, content) {
    if (role === 'user') {
      userScrolledUp = false;
      const wrap = el('msg-user-wrap');
      wrap.appendChild(el('msg-user', esc(content)));
      return append(wrap);
    }
    if (role === 'error') {
      return append(el('msg-err', esc(content)));
    }
    const d = el('msg-ai', renderMarkdown(content));
    return append(d);
  }

  function addToolCard(name, args) {
    const meta = describeToolCall(name, args);
    const card = el('tool running', `
      <div class="tool-hdr">
        <div class="tool-ico ${meta.iconClass}">${meta.icon}</div>
        <div class="tool-body">
          <div class="tool-title">${esc(meta.title)}</div>
          <div class="tool-sub">${esc(meta.subtitle)}</div>
        </div>
        <div class="tool-st running"><div class="sp"></div></div>
      </div>
      <div class="tool-detail"></div>
    `);
    card.querySelector('.tool-hdr').addEventListener('click', () =>
      card.querySelector('.tool-detail').classList.toggle('open'),
    );
    return append(card);
  }

  function updateToolCard(card, result, error) {
    const st = card.querySelector('.tool-st');
    const sub = card.querySelector('.tool-sub');
    const det = card.querySelector('.tool-detail');
    card.classList.remove('running');
    if (error) {
      card.classList.add('error');
      st.className = 'tool-st error';
      st.textContent = '✗';
      sub.textContent = `Error: ${error}`;
    } else {
      card.classList.add('done');
      st.className = 'tool-st done';
      st.textContent = '✓';
      sub.textContent = summarizeToolResult(card.dataset.toolName || '', result);
    }
    const raw = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    const trunc = raw.length > 3000 ? raw.slice(0, 3000) + '\n...' : raw;
    det.innerHTML = `<pre>${esc(trunc)}</pre>`;
    scroll();
  }

  function addReasoningBlock() {
    const block = el('reason open', `
      <div class="reason-hdr">
        <span class="reason-arrow">▶</span>
        <div class="sp"></div>
        <span class="reason-label">Thinking...</span>
      </div>
      <div class="reason-body"></div>
    `);
    block.querySelector('.reason-hdr').addEventListener('click', () =>
      block.classList.toggle('open'),
    );
    return append(block);
  }

  function updateReasoningBlock(block, delta) {
    block.querySelector('.reason-body').textContent += delta;
    scroll();
  }

  function finalizeReasoningBlock(block) {
    const spinner = block.querySelector('.sp');
    if (spinner) spinner.remove();
    const label = block.querySelector('.reason-label');
    const len = block.querySelector('.reason-body').textContent.length;
    label.textContent = `Thinking · ${len} chars`;
    block.classList.remove('open');
  }

  function showThinking(label) {
    const t = el('thinking', `<div class="sp"></div><span>${esc(label || 'Thinking...')}</span>`);
    t.dataset.thinking = 'true';
    return append(t);
  }

  function removeThinking() {
    const t = msgs.querySelector('[data-thinking="true"]');
    if (t) t.remove();
  }

  function setStatus(text) { statusEl.textContent = text; }

  function setInputEnabled(enabled, showStop) {
    inputEl.disabled = !enabled;
    if (showStop) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Stop';
      sendBtn.classList.add('stop');
    } else {
      sendBtn.disabled = !enabled;
      sendBtn.textContent = 'Send';
      sendBtn.classList.remove('stop');
    }
  }

  function updateStreamingMessage(node, text) {
    node.innerHTML = renderMarkdown(text);
    scroll();
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  }

  function renderHistory(items, { onSelect, onDelete }) {
    historyEl.innerHTML = '';
    if (items.length === 0) {
      historyEl.innerHTML = '<div class="history-empty">No conversations yet</div>';
      return;
    }
    for (const item of items) {
      const row = el('history-item');
      row.innerHTML = `
        <div class="history-item-body">
          <div class="history-item-title">${esc(item.title || 'Untitled')}</div>
          <div class="history-item-date">${formatDate(item.createdAt)}</div>
        </div>
        <span class="history-item-del" title="Delete">×</span>
      `;
      row.querySelector('.history-item-body').addEventListener('click', () => {
        historyEl.classList.remove('open');
        onSelect(item.id);
      });
      row.querySelector('.history-item-del').addEventListener('click', (e) => {
        e.stopPropagation();
        onDelete(item.id);
      });
      historyEl.appendChild(row);
    }
  }

  function hideHistory() {
    historyEl.classList.remove('open');
  }

  function clearMessages() {
    msgs.innerHTML = '';
    statusEl.textContent = '';
  }

  return {
    panel,
    providerInput: providerEl,
    apiKeyInput: $('.in-key'),
    modelInput: $('.in-model'),
    baseUrlInput: $('.in-base-url'),
    syncProviderUI,
    messagesEl: msgs,
    inputEl,
    sendBtn,
    newBtn: $('.btn-new'),
    addMessage,
    addToolCard,
    updateToolCard,
    addReasoningBlock,
    updateReasoningBlock,
    finalizeReasoningBlock,
    showThinking,
    removeThinking,
    setStatus,
    setInputEnabled,
    scrollToBottom: scroll,
    updateStreamingMessage,
    renderHistory,
    hideHistory,
    clearMessages,
    set onHistoryOpen(fn) { _onHistoryOpen = fn; },
  };
}
